/* QR-Scanner — rein clientseitig. Decoder: native BarcodeDetector (Chrome, Safari 17+),
   sonst lib/jsQR.js (Cosmo Wolfe, Apache-2.0). Quellen: Kamera, Datei, Einfügen, Drag & Drop. */
'use strict';

buildTopbar('QR scannen');

const $ = (id) => document.getElementById(id);
const video = $('video');
const work = $('work');
const wctx = work.getContext('2d', { willReadFrequently: true });
const LS_CAM = 'tools.martuni.scan.camera';
const SS_HIST = 'tools.martuni.scan.history';
const isApple = /Mac|iPhone|iPad|iPod/.test(navigator.platform || '') || /Mac OS X/.test(navigator.userAgent);
const isAndroid = /Android/.test(navigator.userAgent);

let stream = null, track = null, scanning = false, loopTimer = null;
let engine = '';        // 'native' | 'jsqr'
let detector = null;
let wasScanning = false; // für visibilitychange
let history = [];

/* ---------- Decoder ---------- */
function loadScript(src) {
  return new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => fail(new Error('Laden fehlgeschlagen: ' + src));
    document.head.append(s);
  });
}

async function initDecoder() {
  if ('BarcodeDetector' in window) {
    try {
      const formats = await BarcodeDetector.getSupportedFormats();
      if (formats.includes('qr_code')) {
        detector = new BarcodeDetector({ formats: ['qr_code'] });
        engine = 'native';
      }
    } catch (e) { /* weiter zum Fallback */ }
  }
  if (!engine) { await loadScript('/lib/jsQR.js?v=1'); engine = 'jsqr'; }
  $('engine').textContent = engine === 'native'
    ? 'Erkennung: Browser-eigener Decoder.'
    : 'Erkennung: jsQR (lokal im Browser).';
}

/* Quelle (Video/Bitmap/Bild) auf die Arbeits-Canvas zeichnen und dekodieren. */
async function decodeSource(src, sw, sh, maxW) {
  const scale = Math.min(1, maxW / sw);
  const w = Math.max(1, Math.round(sw * scale)), h = Math.max(1, Math.round(sh * scale));
  work.width = w; work.height = h;
  wctx.drawImage(src, 0, 0, w, h);
  if (engine === 'native') {
    const found = await detector.detect(work);
    return found.length ? found[0].rawValue : null;
  }
  const img = wctx.getImageData(0, 0, w, h);
  const r = jsQR(img.data, w, h, { inversionAttempts: 'attemptBoth' });
  return r ? r.data : null;
}

/* ---------- Kamera ---------- */
function setStatus(msg) { $('vf-status').textContent = msg || ''; $('vf-status').hidden = !msg; }

function showIdle(btnLabel, hint) {
  $('vf-idle').hidden = false;
  $('btn-start').textContent = btnLabel;
  $('vf-idle-hint').textContent = hint || '';
  $('btn-stop').disabled = true;
  setStatus('');
}

function stopCamera() {
  scanning = false;
  clearTimeout(loopTimer);
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null; track = null;
  video.srcObject = null;
  $('btn-torch').hidden = true;
  $('viewfinder').classList.remove('live');
}

async function listCameras() {
  let devs = [];
  try { devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput'); } catch (e) { /* egal */ }
  const sel = $('camera');
  sel.innerHTML = '';
  devs.forEach((d, i) => sel.append(el('option', { value: d.deviceId }, d.label || `Kamera ${i + 1}`)));
  sel.hidden = devs.length < 2;
  const cur = track && track.getSettings().deviceId;
  if (cur) sel.value = cur;
}

async function startCamera(deviceId) {
  stopCamera();
  $('vf-idle').hidden = true;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showIdle('Kamera starten', window.isSecureContext
      ? 'Dieser Browser bietet keinen Kamerazugriff. Bild einfügen oder auswählen funktioniert trotzdem.'
      : 'Kamerazugriff geht nur über HTTPS. Bild einfügen oder auswählen funktioniert trotzdem.');
    return;
  }
  setStatus('Kamera wird gestartet …');
  const vid = { width: { ideal: 1280 }, height: { ideal: 720 } };
  if (deviceId) vid.deviceId = { exact: deviceId }; else vid.facingMode = 'environment';
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: vid, audio: false });
  } catch (e) {
    if (deviceId && e.name === 'OverconstrainedError') { localStorage.removeItem(LS_CAM); return startCamera(); }
    const msgs = {
      NotAllowedError: 'Kamerazugriff wurde abgelehnt. In den Browser-Einstellungen für diese Seite erlauben, dann erneut starten.',
      NotFoundError: 'Keine Kamera gefunden. Bild einfügen oder auswählen funktioniert trotzdem.',
      NotReadableError: 'Die Kamera wird gerade von einer anderen App benutzt.',
    };
    showIdle('Kamera starten', msgs[e.name] || ('Kamera konnte nicht gestartet werden (' + e.name + ').'));
    return;
  }
  track = stream.getVideoTracks()[0];
  video.srcObject = stream;
  try { await video.play(); } catch (e) { /* autoplay-Politik: Video ist muted, sollte gehen */ }
  const st = track.getSettings ? track.getSettings() : {};
  // Frontkamera (MacBook, Selfie) gespiegelt anzeigen — fühlt sich natürlicher an.
  video.classList.toggle('mirror', st.facingMode !== 'environment');
  if (st.deviceId) localStorage.setItem(LS_CAM, st.deviceId);
  const caps = track.getCapabilities ? track.getCapabilities() : {};
  $('btn-torch').hidden = !caps.torch;
  $('btn-torch').dataset.on = '';
  $('btn-stop').disabled = false;
  $('viewfinder').classList.add('live');
  setStatus('');
  listCameras();
  scanning = true;
  scanLoop();
}

async function scanLoop() {
  if (!scanning) return;
  if (video.readyState >= 2 && video.videoWidth) {
    try {
      const text = await decodeSource(video, video.videoWidth, video.videoHeight, engine === 'native' ? 1280 : 640);
      if (text && scanning) { onHit(text, 'Kamera'); return; }
    } catch (e) { console.warn(e); }
  }
  loopTimer = setTimeout(scanLoop, engine === 'native' ? 100 : 140);
}

function onHit(text, source) {
  stopCamera();
  showIdle('Weiter scannen', '');
  if (navigator.vibrate) navigator.vibrate(60);
  showResult(text, Date.now(), true);
  toast('Code erkannt' + (source ? ' (' + source + ')' : ''));
}

/* ---------- Bilder (Datei, Einfügen, Drop) ---------- */
async function scanBlob(blob, source) {
  if (!blob || !blob.type.startsWith('image/')) { toast('Das ist kein Bild'); return; }
  let bmp;
  try { bmp = await createImageBitmap(blob); } catch (e) { toast('Bild konnte nicht gelesen werden'); return; }
  const wasLive = scanning;
  scanning = false; clearTimeout(loopTimer);
  let text = null;
  // Mehrere Größen probieren: große Screenshots bringen jsQR sonst ins Straucheln.
  for (const maxW of [1600, 1000, 600]) {
    try { text = await decodeSource(bmp, bmp.width, bmp.height, maxW); } catch (e) { console.warn(e); }
    if (text) break;
  }
  bmp.close && bmp.close();
  if (text) {
    stopCamera();
    showIdle('Weiter scannen', '');
    showResult(text, Date.now(), true);
    toast('Code erkannt (' + source + ')');
  } else {
    toast('Kein QR-Code im Bild gefunden');
    if (wasLive) { scanning = true; scanLoop(); }
  }
}

$('file').addEventListener('change', () => {
  const f = $('file').files[0];
  if (f) scanBlob(f, 'Datei');
  $('file').value = '';
});

document.addEventListener('paste', (ev) => {
  const items = [...(ev.clipboardData ? ev.clipboardData.items : [])];
  const img = items.find((i) => i.type.startsWith('image/'));
  if (img) { ev.preventDefault(); scanBlob(img.getAsFile(), 'Zwischenablage'); }
});

document.addEventListener('dragover', (ev) => { ev.preventDefault(); document.body.classList.add('dragging'); });
document.addEventListener('dragleave', (ev) => { if (!ev.relatedTarget) document.body.classList.remove('dragging'); });
document.addEventListener('drop', (ev) => {
  ev.preventDefault(); document.body.classList.remove('dragging');
  const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
  if (f) scanBlob(f, 'Datei');
});

/* ---------- Inhalt interpretieren ---------- */
const DANGEROUS = /^(javascript|data|vbscript|file|blob|about):/i;

function unescapeWifi(s) { return s.replace(/\\(.)/g, '$1'); }

function parseWifi(text) {
  const body = text.slice(5);
  const f = {};
  // Felder: T:WPA;S:name;P:pass;H:true;;  — Werte können \; \, \: \\ enthalten
  const re = /([A-Z]):((?:\\.|[^;\\])*);/g;
  let m; while ((m = re.exec(body))) f[m[1]] = unescapeWifi(m[2]);
  return f;
}

function parseQuery(q) {
  const o = {};
  for (const [k, v] of new URLSearchParams(q)) o[k] = v;
  return o;
}

function vcardField(text, name) {
  const m = text.match(new RegExp('^' + name + '(?:;[^:]*)?:(.*)$', 'mi'));
  return m ? m[1].replace(/\\,/g, ',').replace(/\\n/gi, ' ').trim() : '';
}

function mecardToVcard(text) {
  const body = text.slice(7);
  const f = {};
  const re = /([A-Z]+):((?:\\.|[^;\\])*);/g;
  let m; while ((m = re.exec(body))) (f[m[1]] = f[m[1]] || []).push(m[2].replace(/\\(.)/g, '$1'));
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  const n = (f.N && f.N[0]) || '';
  const fn = n.split(',').map((x) => x.trim()).reverse().join(' ').trim();
  lines.push('N:' + n.replace(',', ';'), 'FN:' + fn);
  (f.TEL || []).forEach((t) => lines.push('TEL:' + t));
  (f.EMAIL || []).forEach((t) => lines.push('EMAIL:' + t));
  if (f.ORG) lines.push('ORG:' + f.ORG[0]);
  if (f.URL) lines.push('URL:' + f.URL[0]);
  if (f.ADR) lines.push('ADR:' + f.ADR[0]);
  if (f.NOTE) lines.push('NOTE:' + f.NOTE[0]);
  lines.push('END:VCARD');
  return { vcf: lines.join('\r\n'), name: fn };
}

function mapsHref(lat, lng, q) {
  if (isApple) return 'https://maps.apple.com/?' + (q ? 'q=' + encodeURIComponent(q) : 'll=' + lat + ',' + lng);
  if (isAndroid) return 'geo:' + lat + ',' + lng + (q ? '?q=' + encodeURIComponent(q) : '');
  return 'https://www.google.com/maps?q=' + (q ? encodeURIComponent(q) : lat + ',' + lng);
}

function fmtIcsDate(s) {
  if (!s) return '';
  const m = s.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
  if (!m) return s;
  return `${m[3]}.${m[2]}.${m[1]}` + (m[4] ? ` ${m[4]}:${m[5]}` : '');
}

/* Liefert { type, fields: [[label, value, mono?]], actions: [{label, href?, download?, blob?, copy?, primary?, external?}], note? } */
function interpret(text) {
  const t = text.trim();
  const schemeMatch = t.match(/^([a-z][a-z0-9+.-]{1,30}):/i);
  const scheme = schemeMatch ? schemeMatch[1].toLowerCase() : '';

  if (scheme === 'http' || scheme === 'https') {
    let u; try { u = new URL(t); } catch (e) { u = null; }
    const fields = u ? [['Adresse', u.href, true]] : [['Adresse', t, true]];
    let note = '';
    if (u && u.username) note = 'Achtung: Die Adresse enthält einen Benutzernamen vor dem @ — typisch für Phishing.';
    else if (u && /xn--/.test(u.hostname)) note = 'Achtung: Der Hostname nutzt Sonderzeichen (Punycode) — genau hinsehen.';
    return { type: 'Link', fields, note, actions: [
      { label: 'Öffnen', href: t, external: true, primary: true },
      { label: 'Link kopieren', copy: t },
    ] };
  }

  if (scheme === 'otpauth') {
    let u; try { u = new URL(t); } catch (e) { u = null; }
    const q = u ? parseQuery(u.search) : {};
    const label = u ? decodeURIComponent(u.pathname.replace(/^\/+/, '')) : '';
    const [issuerFromLabel, account] = label.includes(':') ? label.split(/:(.*)/) : ['', label];
    const fields = [
      ['Dienst', q.issuer || issuerFromLabel || '—'],
      ['Konto', account || '—'],
      ['Typ', (u ? u.host : '').toUpperCase() || 'TOTP'],
    ];
    return { type: 'Einmalpasswort (2FA)', fields,
      note: 'Der geheime Schlüssel bleibt hier im Browser. „In Passwort-App öffnen" übergibt ihn an Apple Passwörter / Schlüsselbund, 1Password, Bitwarden, Authenticator o. ä.',
      actions: [
        { label: 'In Passwort-App öffnen', href: t, primary: true },
        { label: 'Schlüssel kopieren', copy: q.secret || '' },
        { label: 'otpauth-URI kopieren', copy: t },
      ] };
  }
  if (scheme === 'otpauth-migration') {
    return { type: 'Authenticator-Export', fields: [['Inhalt', 'Google-Authenticator-Übertragung (mehrere Konten)']],
      actions: [{ label: 'In Authenticator öffnen', href: t, primary: true }, { label: 'URI kopieren', copy: t }] };
  }

  if (/^WIFI:/i.test(t)) {
    const f = parseWifi(t);
    const typ = { WPA: 'WPA/WPA2/WPA3', WEP: 'WEP', nopass: 'offen', '': 'offen' }[f.T || ''] || f.T;
    const fields = [['Netz (SSID)', f.S || '—'], ['Verschlüsselung', typ]];
    if (f.P) fields.push(['Passwort', f.P, true]);
    if (/true/i.test(f.H || '')) fields.push(['Verstecktes Netz', 'ja']);
    const actions = [];
    if (f.P) actions.push({ label: 'Passwort kopieren', copy: f.P, primary: true });
    actions.push({ label: 'SSID kopieren', copy: f.S || '' });
    return { type: 'WLAN-Zugang', fields, actions,
      note: isApple ? 'Auf dem Mac: WLAN-Menü → Netz wählen → Passwort einfügen. iPhone/iPad erkennen solche Codes direkt in der Kamera-App.' : '' };
  }

  if (scheme === 'bitcoin' || scheme === 'lightning' || scheme === 'ethereum' || scheme === 'litecoin' || scheme === 'monero') {
    const rest = t.slice(scheme.length + 1);
    const [addr, query] = rest.split(/\?(.*)/);
    const q = parseQuery(query || '');
    const fields = [['Adresse', addr, true]];
    if (q.amount) fields.push(['Betrag', q.amount + (scheme === 'bitcoin' ? ' BTC' : ''), true]);
    if (q.label) fields.push(['Bezeichnung', q.label]);
    if (q.message) fields.push(['Nachricht', q.message]);
    const name = scheme.charAt(0).toUpperCase() + scheme.slice(1);
    return { type: name + '-Zahlung', fields, actions: [
      { label: 'In Wallet öffnen', href: t, primary: true },
      { label: 'Adresse kopieren', copy: addr },
      { label: 'URI kopieren', copy: t },
    ] };
  }

  if (scheme === 'mailto') {
    let u; try { u = new URL(t); } catch (e) { u = null; }
    const to = u ? decodeURIComponent(u.pathname) : t.slice(7);
    const q = u ? parseQuery(u.search) : {};
    const fields = [['An', to, true]];
    if (q.subject) fields.push(['Betreff', q.subject]);
    if (q.body) fields.push(['Text', q.body]);
    return { type: 'E-Mail', fields, actions: [
      { label: 'E-Mail schreiben', href: t, primary: true },
      { label: 'Adresse kopieren', copy: to },
    ] };
  }
  if (/^MATMSG:/i.test(t)) {
    const g = (k) => { const m = t.match(new RegExp(k + ':((?:\\\\.|[^;])*);', 'i')); return m ? m[1] : ''; };
    const to = g('TO'), sub = g('SUB'), body = g('BODY');
    const href = 'mailto:' + to + '?subject=' + encodeURIComponent(sub) + '&body=' + encodeURIComponent(body);
    return { type: 'E-Mail', fields: [['An', to, true], ['Betreff', sub], ['Text', body]].filter((f) => f[1]),
      actions: [{ label: 'E-Mail schreiben', href, primary: true }, { label: 'Adresse kopieren', copy: to }] };
  }

  if (scheme === 'tel') {
    const num = decodeURIComponent(t.slice(4));
    return { type: 'Telefonnummer', fields: [['Nummer', num, true]], actions: [
      { label: 'Anrufen', href: t, primary: true }, { label: 'Nummer kopieren', copy: num },
    ] };
  }
  if (scheme === 'sms' || scheme === 'smsto') {
    const rest = t.slice(scheme.length + 1);
    const [num, body] = scheme === 'smsto' ? rest.split(/:(.*)/) : [rest.split('?')[0], parseQuery(rest.split('?')[1] || '').body || ''];
    const href = 'sms:' + num + (body ? (isApple ? '&' : '?') + 'body=' + encodeURIComponent(body) : '');
    return { type: 'SMS', fields: [['Nummer', num, true], ['Text', body]].filter((f) => f[1]), actions: [
      { label: 'Nachricht schreiben', href, primary: true }, { label: 'Nummer kopieren', copy: num },
    ] };
  }

  if (scheme === 'geo') {
    const m = t.match(/^geo:(-?[\d.]+),(-?[\d.]+)(?:[;,][^?]*)?(?:\?(.*))?$/i);
    if (m) {
      const q = parseQuery(m[3] || '');
      return { type: 'Ort', fields: [['Koordinaten', m[1] + ', ' + m[2], true], q.q ? ['Suche', q.q] : null].filter(Boolean), actions: [
        { label: 'Karte öffnen', href: mapsHref(m[1], m[2], q.q), external: true, primary: true },
        { label: 'Koordinaten kopieren', copy: m[1] + ',' + m[2] },
      ] };
    }
  }

  if (/^BEGIN:VCARD/im.test(t) || /^MECARD:/i.test(t)) {
    let vcf = t, name;
    if (/^MECARD:/i.test(t)) ({ vcf, name } = mecardToVcard(t));
    else name = vcardField(vcf, 'FN') || vcardField(vcf, 'N').replace(/;/g, ' ').trim();
    const fields = [['Name', name || '—']];
    const tel = vcardField(vcf, 'TEL'), mail = vcardField(vcf, 'EMAIL'), org = vcardField(vcf, 'ORG'), url = vcardField(vcf, 'URL');
    if (org) fields.push(['Organisation', org]);
    if (tel) fields.push(['Telefon', tel, true]);
    if (mail) fields.push(['E-Mail', mail, true]);
    if (url) fields.push(['Web', url, true]);
    const actions = [{ label: 'Zu Kontakten hinzufügen', download: (name || 'kontakt').replace(/[^\w.-]+/g, '_') + '.vcf',
      blob: new Blob([vcf], { type: 'text/vcard' }), primary: true,
      hint: 'Lädt eine .vcf-Datei — Öffnen fügt den Kontakt in Kontakte/Outlook ein.' }];
    if (tel) actions.push({ label: 'Telefon kopieren', copy: tel });
    if (mail) actions.push({ label: 'E-Mail kopieren', copy: mail });
    return { type: 'Kontakt', fields, actions };
  }

  if (/^BEGIN:VEVENT/im.test(t) || /^BEGIN:VCALENDAR/im.test(t)) {
    let ics = t;
    if (!/^BEGIN:VCALENDAR/im.test(ics)) ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//tools.martuni.de//QR//DE\r\n' + ics + '\r\nEND:VCALENDAR';
    const fields = [['Titel', vcardField(t, 'SUMMARY') || '—'], ['Beginn', fmtIcsDate(vcardField(t, 'DTSTART'))]];
    const end = vcardField(t, 'DTEND'); if (end) fields.push(['Ende', fmtIcsDate(end)]);
    const loc = vcardField(t, 'LOCATION'); if (loc) fields.push(['Ort', loc]);
    return { type: 'Termin', fields, actions: [
      { label: 'In Kalender übernehmen', download: 'termin.ics', blob: new Blob([ics], { type: 'text/calendar' }), primary: true,
        hint: 'Lädt eine .ics-Datei — Öffnen legt den Termin im Kalender an.' },
    ] };
  }

  if (scheme && !DANGEROUS.test(t)) {
    return { type: 'App-Link (' + scheme + ':)', fields: [['Inhalt', t, true]],
      note: 'Unbekanntes Schema — „Mit App öffnen" reicht die Adresse ans System weiter; eine passende App muss installiert sein.',
      actions: [{ label: 'Mit App öffnen', href: t, primary: true }, { label: 'Kopieren', copy: t }] };
  }

  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(t) && !/\s/.test(t)) {
    return { type: 'Adresse ohne https://', fields: [['Adresse', t, true]], actions: [
      { label: 'Öffnen', href: 'https://' + t, external: true, primary: true }, { label: 'Kopieren', copy: t },
    ] };
  }

  const isNum = /^\d{6,}$/.test(t);
  return { type: isNum ? 'Zahl / Code' : 'Text', fields: [['Inhalt', t, isNum]],
    actions: [{ label: 'Kopieren', copy: t, primary: true }] };
}

/* ---------- Ergebnis anzeigen ---------- */
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function showResult(text, ts, addToHistory) {
  const r = interpret(text);
  $('empty').hidden = true;
  $('result').hidden = false;
  $('res-type').textContent = r.type;
  $('res-when').textContent = fmtDateTime(ts);
  const body = $('res-body');
  body.innerHTML = '';
  if (r.note) body.append(el('div', { class: 'alert ' + (/^Achtung/.test(r.note) ? 'alert-warn' : 'alert-info'), html: ICONS.info }, el('span', {}, r.note)));
  const dl = el('dl', { class: 'kv' });
  for (const [k, v, mono] of r.fields) {
    dl.append(el('dt', {}, k), el('dd', { class: mono ? 'mono' : '' }, v));
  }
  body.append(dl);
  const acts = $('res-actions');
  acts.innerHTML = '';
  for (const a of r.actions) {
    const cls = 'btn ' + (a.primary ? 'btn-primary' : 'btn-outline');
    let node;
    if (a.href) node = el('a', { class: cls, href: a.href, target: a.external ? '_blank' : null, rel: a.external ? 'noopener noreferrer' : null }, a.label);
    else if (a.blob) node = el('button', { class: cls, type: 'button', onclick: () => download(a.blob, a.download) }, a.label);
    else node = el('button', { class: cls, type: 'button', onclick: () => copyText(a.copy, a.label.replace(/ kopieren$/, '') + ' kopiert') }, a.label);
    if (a.hint) node.title = a.hint;
    acts.append(node);
  }
  acts.append(el('span', { class: 'topbar-spacer' }),
    el('a', { class: 'btn btn-outline', href: '/qr?text=' + encodeURIComponent(text), title: 'Diesen Inhalt als neuen QR-Code erzeugen' }, 'Als QR erstellen'));
  $('res-raw').textContent = text;
  const raw = $('res-raw').parentElement;
  let copyRaw = raw.querySelector('.btn');
  if (!copyRaw) { copyRaw = el('button', { class: 'btn btn-outline', type: 'button', onclick: () => copyText(text, 'Rohinhalt kopiert') }, 'Rohinhalt kopieren'); raw.append(copyRaw); }
  else copyRaw.onclick = () => copyText(text, 'Rohinhalt kopiert');

  if (addToHistory) {
    history = [{ text, ts }, ...history.filter((h) => h.text !== text)].slice(0, 8);
    try { sessionStorage.setItem(SS_HIST, JSON.stringify(history)); } catch (e) { /* egal */ }
    renderHistory();
  }
}

function renderHistory() {
  const ul = $('history');
  ul.innerHTML = '';
  $('history-card').hidden = history.length === 0;
  for (const h of history) {
    const r = interpret(h.text);
    ul.append(el('li', {}, el('button', { type: 'button', onclick: () => showResult(h.text, h.ts, false) },
      el('span', { class: 'badge' }, r.type),
      el('span', { class: 'hist-text mono' }, h.text.length > 60 ? h.text.slice(0, 60) + '…' : h.text))));
  }
}

/* ---------- Verdrahtung ---------- */
$('btn-start').addEventListener('click', () => startCamera(localStorage.getItem(LS_CAM) || undefined));
$('btn-stop').addEventListener('click', () => { stopCamera(); showIdle('Kamera starten', ''); });
$('camera').addEventListener('change', () => startCamera($('camera').value));
$('btn-torch').addEventListener('click', async () => {
  if (!track) return;
  const on = $('btn-torch').dataset.on !== '1';
  try { await track.applyConstraints({ advanced: [{ torch: on }] }); $('btn-torch').dataset.on = on ? '1' : ''; }
  catch (e) { toast('Licht nicht verfügbar'); }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { wasScanning = scanning; if (scanning) { stopCamera(); showIdle('Kamera starten', ''); } }
  else if (wasScanning) { wasScanning = false; startCamera(localStorage.getItem(LS_CAM) || undefined); }
});

(async function init() {
  try { history = JSON.parse(sessionStorage.getItem(SS_HIST) || '[]'); } catch (e) { history = []; }
  renderHistory();
  try { await initDecoder(); }
  catch (e) { showIdle('Kamera starten', 'Decoder konnte nicht geladen werden: ' + e.message); return; }
  startCamera(localStorage.getItem(LS_CAM) || undefined);
})();
