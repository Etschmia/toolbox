/* Server für tools.martuni.de (Toolbox)
   Einzige serverseitige Funktion: "Geheimnisse" (Burn-after-read).
   Der Browser verschlüsselt den Text (AES-GCM, WebCrypto) — hier landet nur
   Chiffrat + Metadaten als JSON in data/. Der Schlüssel steckt im URL-Fragment
   (#...), das der Browser nie mitsendet: Der Server kann nichts lesen.

   Ablauf-Regeln:
     mode "once"   → beim ersten Öffnen ausgeliefert und sofort gelöscht
     mode "hours"  → beim ersten Öffnen startet die Uhr; nach N Stunden gelöscht
     ungeöffnet    → nach MAX_UNOPENED_DAYS gelöscht

   Lokal dient der Server auch als statischer Fallback (Produktion: Caddy). */

'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = process.env.PORT || 8341;
const HOST = '127.0.0.1';
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DESIGN_DIR = path.join(__dirname, 'design');
const MAX_BODY = 256 * 1024;                     // 256 KB Chiffrat
const MAX_UNOPENED_DAYS = 7;
const MAX_HOURS = 24 * 7;                        // längste Lesefrist nach 1. Öffnen
const CREATE_LIMIT_PER_HOUR = 60;                // pro IP
const SHORT_DIR = path.join(DATA_DIR, 'short');
const TOOLS_KEY = process.env.TOOLS_KEY || '';    // Schlüssel fürs Anlegen von Kurzlinks

fs.mkdirSync(SHORT_DIR, { recursive: true });
if (!TOOLS_KEY) console.warn('WARNUNG: TOOLS_KEY nicht gesetzt — Kurzlinks anlegen ist gesperrt');

const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
function newId(len = 12) {
  let id = '';
  for (let i = 0; i < len; i++) id += ID_ALPHABET[crypto.randomInt(ID_ALPHABET.length)];
  return id;
}

function filePath(id) { return path.join(DATA_DIR, id + '.json'); }

function readRecord(id) {
  try { return JSON.parse(fs.readFileSync(filePath(id), 'utf8')); } catch (e) { return null; }
}

function burn(id) {
  try { fs.unlinkSync(filePath(id)); } catch (e) { /* schon weg */ }
}

/* Ist der Datensatz noch gültig? Wenn nicht: löschen und null zurückgeben. */
function liveRecord(id) {
  const rec = readRecord(id);
  if (!rec) return null;
  const now = Date.now();
  if (rec.expiresAt && now >= rec.expiresAt) { burn(id); return null; }
  if (!rec.firstRead && now >= rec.created + MAX_UNOPENED_DAYS * 86400000) { burn(id); return null; }
  return rec;
}

function cleanup() {
  for (const f of fs.readdirSync(DATA_DIR)) {
    if (f.endsWith('.json')) liveRecord(f.slice(0, -5));
  }
}
cleanup();
setInterval(cleanup, 15 * 60 * 1000).unref();

/* Einfaches Rate-Limit für das Anlegen (pro IP, gleitende Stunde) */
const createHits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const arr = (createHits.get(ip) || []).filter((t) => t > now - 3600000);
  if (arr.length >= CREATE_LIMIT_PER_HOUR) { createHits.set(ip, arr); return true; }
  arr.push(now);
  createHits.set(ip, arr);
  return false;
}
setInterval(() => {
  const cut = Date.now() - 3600000;
  for (const [ip, arr] of createHits) {
    const keep = arr.filter((t) => t > cut);
    if (keep.length) createHits.set(ip, keep); else createHits.delete(ip);
  }
}, 10 * 60 * 1000).unref();

function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  return (xff ? String(xff).split(',')[0].trim() : req.socket.remoteAddress) || '?';
}

function sendJson(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(obj));
}

function readBody(req, res, cb) {
  let size = 0;
  const chunks = [];
  req.on('data', (c) => {
    size += c.length;
    if (size > MAX_BODY) {
      sendJson(res, 413, { error: 'Zu groß (max. 256 KB)' });
      req.destroy();
      return;
    }
    chunks.push(c);
  });
  req.on('end', () => {
    if (res.writableEnded) return;
    let payload;
    try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null'); } catch (e) {
      return sendJson(res, 400, { error: 'Ungültiges JSON' });
    }
    cb(payload);
  });
}

const B64 = /^[A-Za-z0-9+/=_-]+$/;

function handleApi(req, res) {
  const url = req.url.split('?')[0];

  // POST /api/secret — Chiffrat ablegen
  if (req.method === 'POST' && url === '/api/secret') {
    if (rateLimited(clientIp(req))) return sendJson(res, 429, { error: 'Zu viele Anfragen — später erneut versuchen' });
    return readBody(req, res, (p) => {
      if (!p || typeof p.ct !== 'string' || typeof p.iv !== 'string' || !B64.test(p.ct) || !B64.test(p.iv)) {
        return sendJson(res, 400, { error: 'Erwartet: { ct, iv, mode, hours? }' });
      }
      const mode = p.mode === 'hours' ? 'hours' : 'once';
      let hours = 0;
      if (mode === 'hours') {
        hours = Number(p.hours);
        if (!Number.isFinite(hours) || hours < 0.25 || hours > MAX_HOURS) {
          return sendJson(res, 400, { error: `Frist zwischen 0,25 und ${MAX_HOURS} Stunden` });
        }
      }
      const id = newId();
      const rec = {
        version: 1,
        created: Date.now(),
        mode,
        hours,
        pass: !!p.pass,            // zusätzlich passphrasengeschützt (nur Anzeige-Hinweis)
        salt: typeof p.salt === 'string' && B64.test(p.salt) ? p.salt : undefined,
        iv: p.iv,
        ct: p.ct,
        firstRead: null,
        expiresAt: null,
      };
      fs.writeFileSync(filePath(id), JSON.stringify(rec), { mode: 0o600 });
      return sendJson(res, 201, { id, maxUnopenedDays: MAX_UNOPENED_DAYS });
    });
  }

  // GET /api/secret/<id> — Metadaten (für die Bestätigungsseite; kein Chiffrat)
  let m = req.method === 'GET' && url.match(/^\/api\/secret\/([A-Za-z0-9]{12})$/);
  if (m) {
    const rec = liveRecord(m[1]);
    if (!rec) return sendJson(res, 404, { error: 'Unbekannt, abgelaufen oder bereits gelesen' });
    return sendJson(res, 200, {
      mode: rec.mode, hours: rec.hours, pass: rec.pass,
      opened: !!rec.firstRead, expiresAt: rec.expiresAt,
    });
  }

  // POST /api/secret/<id>/open — Chiffrat ausliefern; "once" wird dabei gelöscht,
  // "hours" startet beim ersten Öffnen die Frist
  m = req.method === 'POST' && url.match(/^\/api\/secret\/([A-Za-z0-9]{12})\/open$/);
  if (m) {
    const id = m[1];
    const rec = liveRecord(id);
    if (!rec) return sendJson(res, 404, { error: 'Unbekannt, abgelaufen oder bereits gelesen' });
    if (rec.mode === 'once') {
      burn(id);
    } else if (!rec.firstRead) {
      rec.firstRead = Date.now();
      rec.expiresAt = rec.firstRead + rec.hours * 3600000;
      fs.writeFileSync(filePath(id), JSON.stringify(rec), { mode: 0o600 });
    }
    return sendJson(res, 200, {
      ct: rec.ct, iv: rec.iv, salt: rec.salt, pass: rec.pass,
      mode: rec.mode, expiresAt: rec.expiresAt,
    });
  }

  // DELETE /api/secret/<id> — Absender/Empfänger vernichtet vorzeitig
  m = req.method === 'DELETE' && url.match(/^\/api\/secret\/([A-Za-z0-9]{12})$/);
  if (m) { burn(m[1]); return sendJson(res, 200, { ok: true }); }

  /* ---------- Kurzlinks ---------- */

  // POST /api/short { url, key, code? } — anlegen (nur mit Schlüssel)
  if (req.method === 'POST' && url === '/api/short') {
    if (rateLimited(clientIp(req))) return sendJson(res, 429, { error: 'Zu viele Anfragen' });
    return readBody(req, res, (p) => {
      if (!TOOLS_KEY || !p || typeof p.key !== 'string' ||
          p.key.length !== TOOLS_KEY.length ||
          !crypto.timingSafeEqual(Buffer.from(p.key), Buffer.from(TOOLS_KEY))) {
        return sendJson(res, 403, { error: 'Schlüssel fehlt oder ist falsch' });
      }
      let target;
      try { target = new URL(String(p.url)); } catch (e) { target = null; }
      if (!target || !/^https?:$/.test(target.protocol) || String(p.url).length > 4096) {
        return sendJson(res, 400, { error: 'Bitte eine http(s)-Adresse angeben' });
      }
      let code = newId(6);
      if (p.code) {
        if (!/^[A-Za-z0-9_-]{3,32}$/.test(p.code)) return sendJson(res, 400, { error: 'Wunschkürzel: 3–32 Zeichen, a–z A–Z 0–9 _ -' });
        if (['s', 'qr', 'secret', 'short', 'api', 'design', 'index'].includes(p.code.toLowerCase()) ||
            fs.existsSync(path.join(SHORT_DIR, p.code + '.json'))) {
          return sendJson(res, 409, { error: 'Kürzel ist schon vergeben' });
        }
        code = p.code;
      }
      fs.writeFileSync(path.join(SHORT_DIR, code + '.json'),
        JSON.stringify({ url: target.href, created: Date.now(), hits: 0 }), { mode: 0o600 });
      return sendJson(res, 201, { code });
    });
  }

  // GET /api/short/<code> — Ziel + Zähler (für die Vorschau/Statistik)
  m = req.method === 'GET' && url.match(/^\/api\/short\/([A-Za-z0-9_-]{3,32})$/);
  if (m) {
    const rec = readShort(m[1]);
    if (!rec) return sendJson(res, 404, { error: 'Unbekanntes Kürzel' });
    return sendJson(res, 200, rec);
  }

  return sendJson(res, 404, { error: 'Unbekannte API-Route' });
}

function readShort(code) {
  try { return JSON.parse(fs.readFileSync(path.join(SHORT_DIR, code + '.json'), 'utf8')); } catch (e) { return null; }
}

/* GET /<code> — Weiterleitung. Zähler wird best-effort hochgezählt. */
function handleRedirect(req, res) {
  const code = req.url.split('?')[0].slice(1);
  const rec = readShort(code);
  if (!rec) return false;
  rec.hits = (rec.hits || 0) + 1;
  rec.lastHit = Date.now();
  try { fs.writeFileSync(path.join(SHORT_DIR, code + '.json'), JSON.stringify(rec), { mode: 0o600 }); } catch (e) { /* egal */ }
  res.writeHead(302, { Location: rec.url, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
  res.end();
  return true;
}

/* ---------- statischer Fallback (nur lokal relevant) ---------- */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.md': 'text/markdown; charset=utf-8',
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (/^\/s\/[A-Za-z0-9]+$/.test(urlPath)) urlPath = '/open.html';   // Geheimnis-Links
  let file;
  if (urlPath.startsWith('/design/')) {
    file = path.join(DESIGN_DIR, urlPath.slice('/design/'.length));
    if (!file.startsWith(DESIGN_DIR + path.sep)) file = null;
  } else {
    let rel = urlPath === '/' ? 'index.html' : urlPath.slice(1);
    file = path.join(PUBLIC_DIR, rel);
    if (!file.startsWith(PUBLIC_DIR + path.sep)) file = null;
    // /qr → qr.html, /secret → secret.html
    if (file && !fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
  }
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Nicht gefunden');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}

http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) return handleApi(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  if (/^\/[A-Za-z0-9_-]{3,32}$/.test(req.url.split('?')[0]) && handleRedirect(req, res)) return;
  serveStatic(req, res);
}).listen(PORT, HOST, () => {
  console.log(`toolbox-Server läuft auf http://${HOST}:${PORT}`);
});
