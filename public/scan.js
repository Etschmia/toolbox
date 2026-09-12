/* QR-Scanner — rein clientseitig. Decoder: native BarcodeDetector (Chrome, Safari 17+),
   sonst lib/jsQR.js (Cosmo Wolfe, Apache-2.0). Quellen: Kamera, Datei, Einfügen, Drag & Drop. */
'use strict';

buildTopbar('nav.scan');

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
  showEngine();
}
function showEngine() {
  if (engine) $('engine').textContent = t(engine === 'native' ? 'scan.engineNative' : 'scan.engineJsqr');
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

let idleBtnKey = 'scan.start';
function showIdle(btnKey, hint) {
  idleBtnKey = btnKey;
  $('vf-idle').hidden = false;
  $('btn-start').textContent = t(btnKey);
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
  devs.forEach((d, i) => sel.append(el('option', { value: d.deviceId }, d.label || t('scan.camN', { n: i + 1 }))));
  sel.hidden = devs.length < 2;
  const cur = track && track.getSettings().deviceId;
  if (cur) sel.value = cur;
}

async function startCamera(deviceId) {
  stopCamera();
  $('vf-idle').hidden = true;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showIdle('scan.start', t(window.isSecureContext ? 'scan.noCamApi' : 'scan.noHttps'));
    return;
  }
  setStatus(t('scan.starting'));
  const vid = { width: { ideal: 1280 }, height: { ideal: 720 } };
  if (deviceId) vid.deviceId = { exact: deviceId }; else vid.facingMode = 'environment';
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: vid, audio: false });
  } catch (e) {
    if (deviceId && e.name === 'OverconstrainedError') { localStorage.removeItem(LS_CAM); return startCamera(); }
    const msgs = { NotAllowedError: 'scan.denied', NotFoundError: 'scan.noCam', NotReadableError: 'scan.busy' };
    showIdle('scan.start', msgs[e.name] ? t(msgs[e.name]) : t('scan.failed', { name: e.name }));
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
      if (text && scanning) { onHit(text, 'scan.srcCamera'); return; }
    } catch (e) { console.warn(e); }
  }
  loopTimer = setTimeout(scanLoop, engine === 'native' ? 100 : 140);
}

function onHit(text, source) {
  stopCamera();
  showIdle('scan.again', '');
  if (navigator.vibrate) navigator.vibrate(60);
  showResult(text, Date.now(), true);
  toast(t('scan.hit') + (source ? ' (' + t(source) + ')' : ''));
}

/* ---------- Bilder (Datei, Einfügen, Drop) ---------- */
async function scanBlob(blob, source) {
  if (!blob || !blob.type.startsWith('image/')) { toast(t('scan.notImage')); return; }
  let bmp;
  try { bmp = await createImageBitmap(blob); } catch (e) { toast(t('scan.unreadable')); return; }
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
    showIdle('scan.again', '');
    showResult(text, Date.now(), true);
    toast(t('scan.hit') + ' (' + t(source) + ')');
  } else {
    toast(t('scan.notFound'));
    if (wasLive) { scanning = true; scanLoop(); }
  }
}

$('file').addEventListener('change', () => {
  const f = $('file').files[0];
  if (f) scanBlob(f, 'scan.srcFile');
  $('file').value = '';
});

document.addEventListener('paste', (ev) => {
  const items = [...(ev.clipboardData ? ev.clipboardData.items : [])];
  const img = items.find((i) => i.type.startsWith('image/'));
  if (img) { ev.preventDefault(); scanBlob(img.getAsFile(), 'scan.srcClipboard'); }
});

document.addEventListener('dragover', (ev) => { ev.preventDefault(); document.body.classList.add('dragging'); });
document.addEventListener('dragleave', (ev) => { if (!ev.relatedTarget) document.body.classList.remove('dragging'); });
document.addEventListener('drop', (ev) => {
  ev.preventDefault(); document.body.classList.remove('dragging');
  const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
  if (f) scanBlob(f, 'scan.srcFile');
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
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0));
  return d.toLocaleString(I18N.locale, m[4] ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' });
}

/* Liefert { type, fields: [[label, value, mono?]], actions: [{label, href?, download?, blob?, copy?, primary?, external?}], note?, warn? } */
const T = I18N.t; // in interpret() heißt der Rohtext `t`
function interpret(text) {
  const t = text.trim();
  const schemeMatch = t.match(/^([a-z][a-z0-9+.-]{1,30}):/i);
  const scheme = schemeMatch ? schemeMatch[1].toLowerCase() : '';

  if (scheme === 'http' || scheme === 'https') {
    let u; try { u = new URL(t); } catch (e) { u = null; }
    const fields = [[T('f.address'), u ? u.href : t, true]];
    let note = '', warn = false;
    if (u && u.username) { note = T('n.phishing'); warn = true; }
    else if (u && /xn--/.test(u.hostname)) { note = T('n.punycode'); warn = true; }
    return { type: T('type.link'), fields, note, warn, actions: [
      { label: T('a.open'), href: t, external: true, primary: true },
      { label: T('a.copyLink'), copy: t },
    ] };
  }

  if (scheme === 'otpauth') {
    let u; try { u = new URL(t); } catch (e) { u = null; }
    const q = u ? parseQuery(u.search) : {};
    const label = u ? decodeURIComponent(u.pathname.replace(/^\/+/, '')) : '';
    const [issuerFromLabel, account] = label.includes(':') ? label.split(/:(.*)/) : ['', label];
    const fields = [
      [T('f.service'), q.issuer || issuerFromLabel || '—'],
      [T('f.account'), account || '—'],
      [T('f.type'), (u ? u.host : '').toUpperCase() || 'TOTP'],
    ];
    return { type: T('type.otp'), fields,
      note: T('n.otp'),
      actions: [
        { label: T('a.openPassApp'), href: t, primary: true },
        { label: T('a.copyKey'), copy: q.secret || '' },
        { label: T('a.copyOtp'), copy: t },
      ] };
  }
  if (scheme === 'otpauth-migration') {
    return { type: T('type.authExport'), fields: [[T('f.content'), T('f.migration')]],
      actions: [{ label: T('a.openAuth'), href: t, primary: true }, { label: T('a.copyUri'), copy: t }] };
  }

  if (/^WIFI:/i.test(t)) {
    const f = parseWifi(t);
    const typ = { WPA: 'WPA/WPA2/WPA3', WEP: 'WEP', nopass: T('f.open'), '': T('f.open') }[f.T || ''] || f.T;
    const fields = [[T('f.ssid'), f.S || '—'], [T('f.enc'), typ]];
    if (f.P) fields.push([T('f.password'), f.P, true]);
    if (/true/i.test(f.H || '')) fields.push([T('f.hiddenNet'), T('f.yes')]);
    const actions = [];
    if (f.P) actions.push({ label: T('a.copyPass'), copy: f.P, primary: true });
    actions.push({ label: T('a.copySsid'), copy: f.S || '' });
    return { type: T('type.wifi'), fields, actions, note: isApple ? T('n.wifiMac') : '' };
  }

  if (scheme === 'bitcoin' || scheme === 'lightning' || scheme === 'ethereum' || scheme === 'litecoin' || scheme === 'monero') {
    const rest = t.slice(scheme.length + 1);
    const [addr, query] = rest.split(/\?(.*)/);
    const q = parseQuery(query || '');
    const fields = [[T('f.address'), addr, true]];
    if (q.amount) fields.push([T('f.amount'), q.amount + (scheme === 'bitcoin' ? ' BTC' : ''), true]);
    if (q.label) fields.push([T('f.label'), q.label]);
    if (q.message) fields.push([T('f.message'), q.message]);
    const name = scheme.charAt(0).toUpperCase() + scheme.slice(1);
    return { type: T('type.payment', { name }), fields, actions: [
      { label: T('a.openWallet'), href: t, primary: true },
      { label: T('a.copyAddr'), copy: addr },
      { label: T('a.copyUri'), copy: t },
    ] };
  }

  if (scheme === 'mailto') {
    let u; try { u = new URL(t); } catch (e) { u = null; }
    const to = u ? decodeURIComponent(u.pathname) : t.slice(7);
    const q = u ? parseQuery(u.search) : {};
    const fields = [[T('f.to'), to, true]];
    if (q.subject) fields.push([T('f.subject'), q.subject]);
    if (q.body) fields.push([T('f.text'), q.body]);
    return { type: T('type.email'), fields, actions: [
      { label: T('a.writeEmail'), href: t, primary: true },
      { label: T('a.copyAddr'), copy: to },
    ] };
  }
  if (/^MATMSG:/i.test(t)) {
    const g = (k) => { const m = t.match(new RegExp(k + ':((?:\\\\.|[^;])*);', 'i')); return m ? m[1] : ''; };
    const to = g('TO'), sub = g('SUB'), body = g('BODY');
    const href = 'mailto:' + to + '?subject=' + encodeURIComponent(sub) + '&body=' + encodeURIComponent(body);
    return { type: T('type.email'), fields: [[T('f.to'), to, true], [T('f.subject'), sub], [T('f.text'), body]].filter((f) => f[1]),
      actions: [{ label: T('a.writeEmail'), href, primary: true }, { label: T('a.copyAddr'), copy: to }] };
  }

  if (scheme === 'tel') {
    const num = decodeURIComponent(t.slice(4));
    return { type: T('type.phone'), fields: [[T('f.number'), num, true]], actions: [
      { label: T('a.call'), href: t, primary: true }, { label: T('a.copyNumber'), copy: num },
    ] };
  }
  if (scheme === 'sms' || scheme === 'smsto') {
    const rest = t.slice(scheme.length + 1);
    const [num, body] = scheme === 'smsto' ? rest.split(/:(.*)/) : [rest.split('?')[0], parseQuery(rest.split('?')[1] || '').body || ''];
    const href = 'sms:' + num + (body ? (isApple ? '&' : '?') + 'body=' + encodeURIComponent(body) : '');
    return { type: T('type.sms'), fields: [[T('f.number'), num, true], [T('f.text'), body]].filter((f) => f[1]), actions: [
      { label: T('a.writeSms'), href, primary: true }, { label: T('a.copyNumber'), copy: num },
    ] };
  }

  if (scheme === 'geo') {
    const m = t.match(/^geo:(-?[\d.]+),(-?[\d.]+)(?:[;,][^?]*)?(?:\?(.*))?$/i);
    if (m) {
      const q = parseQuery(m[3] || '');
      return { type: T('type.place'), fields: [[T('f.coords'), m[1] + ', ' + m[2], true], q.q ? [T('f.search'), q.q] : null].filter(Boolean), actions: [
        { label: T('a.openMap'), href: mapsHref(m[1], m[2], q.q), external: true, primary: true },
        { label: T('a.copyCoords'), copy: m[1] + ',' + m[2] },
      ] };
    }
  }

  if (/^BEGIN:VCARD/im.test(t) || /^MECARD:/i.test(t)) {
    let vcf = t, name;
    if (/^MECARD:/i.test(t)) ({ vcf, name } = mecardToVcard(t));
    else name = vcardField(vcf, 'FN') || vcardField(vcf, 'N').replace(/;/g, ' ').trim();
    const fields = [[T('f.name'), name || '—']];
    const tel = vcardField(vcf, 'TEL'), mail = vcardField(vcf, 'EMAIL'), org = vcardField(vcf, 'ORG'), url = vcardField(vcf, 'URL');
    if (org) fields.push([T('f.org'), org]);
    if (tel) fields.push([T('f.phone'), tel, true]);
    if (mail) fields.push([T('f.email'), mail, true]);
    if (url) fields.push([T('f.web'), url, true]);
    const actions = [{ label: T('a.addContact'), download: (name || 'contact').replace(/[^\p{L}\p{N}.-]+/gu, '_') + '.vcf',
      blob: new Blob([vcf], { type: 'text/vcard' }), primary: true, hint: T('a.contactHint') }];
    if (tel) actions.push({ label: T('a.copyPhone'), copy: tel });
    if (mail) actions.push({ label: T('a.copyEmail'), copy: mail });
    return { type: T('type.contact'), fields, actions };
  }

  if (/^BEGIN:VEVENT/im.test(t) || /^BEGIN:VCALENDAR/im.test(t)) {
    let ics = t;
    if (!/^BEGIN:VCALENDAR/im.test(ics)) ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//tools.martuni.de//QR//DE\r\n' + ics + '\r\nEND:VCALENDAR';
    const fields = [[T('f.title'), vcardField(t, 'SUMMARY') || '—'], [T('f.begin'), fmtIcsDate(vcardField(t, 'DTSTART'))]];
    const end = vcardField(t, 'DTEND'); if (end) fields.push([T('f.end'), fmtIcsDate(end)]);
    const loc = vcardField(t, 'LOCATION'); if (loc) fields.push([T('f.location'), loc]);
    return { type: T('type.event'), fields, actions: [
      { label: T('a.addCalendar'), download: 'event.ics', blob: new Blob([ics], { type: 'text/calendar' }), primary: true,
        hint: T('a.calendarHint') },
    ] };
  }

  if (scheme && !DANGEROUS.test(t)) {
    return { type: T('type.app', { scheme }), fields: [[T('f.content'), t, true]],
      note: T('n.unknownScheme'),
      actions: [{ label: T('a.openApp'), href: t, primary: true }, { label: T('copy'), copy: t }] };
  }

  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(t) && !/\s/.test(t)) {
    return { type: T('type.bareUrl'), fields: [[T('f.address'), t, true]], actions: [
      { label: T('a.open'), href: 'https://' + t, external: true, primary: true }, { label: T('copy'), copy: t },
    ] };
  }

  const isNum = /^\d{6,}$/.test(t);
  return { type: T(isNum ? 'type.number' : 'type.text'), fields: [[T('f.content'), t, isNum]],
    actions: [{ label: T('copy'), copy: t, primary: true }] };
}

/* ---------- Ergebnis anzeigen ---------- */
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

let lastShown = null; // { text, ts } — für Neuaufbau beim Sprachwechsel
function showResult(text, ts, addToHistory) {
  lastShown = { text, ts };
  const r = interpret(text);
  $('empty').hidden = true;
  $('result').hidden = false;
  $('res-type').textContent = r.type;
  $('res-when').textContent = fmtDateTime(ts);
  const body = $('res-body');
  body.innerHTML = '';
  if (r.note) body.append(el('div', { class: 'alert ' + (r.warn ? 'alert-warn' : 'alert-info'), html: ICONS.info }, el('span', {}, r.note)));
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
    else node = el('button', { class: cls, type: 'button', onclick: () => copyText(a.copy) }, a.label);
    if (a.hint) node.title = a.hint;
    acts.append(node);
  }
  acts.append(el('span', { class: 'topbar-spacer' }),
    el('a', { class: 'btn btn-outline', href: '/qr?text=' + encodeURIComponent(text), title: t('scan.asQrTitle') }, t('scan.asQr')));
  $('res-raw').textContent = text;
  const raw = $('res-raw').parentElement;
  let copyRaw = raw.querySelector('.btn');
  if (!copyRaw) { copyRaw = el('button', { class: 'btn btn-outline', type: 'button' }, ''); raw.append(copyRaw); }
  copyRaw.textContent = t('scan.rawCopy');
  copyRaw.onclick = () => copyText(text);

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
$('btn-stop').addEventListener('click', () => { stopCamera(); showIdle('scan.start', ''); });
$('camera').addEventListener('change', () => startCamera($('camera').value));
$('btn-torch').addEventListener('click', async () => {
  if (!track) return;
  const on = $('btn-torch').dataset.on !== '1';
  try { await track.applyConstraints({ advanced: [{ torch: on }] }); $('btn-torch').dataset.on = on ? '1' : ''; }
  catch (e) { toast(t('scan.torchNA')); }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { wasScanning = scanning; if (scanning) { stopCamera(); showIdle('scan.start', ''); } }
  else if (wasScanning) { wasScanning = false; startCamera(localStorage.getItem(LS_CAM) || undefined); }
});

(async function init() {
  try { history = JSON.parse(sessionStorage.getItem(SS_HIST) || '[]'); } catch (e) { history = []; }
  renderHistory();
  try { await initDecoder(); }
  catch (e) { showIdle('scan.start', t('scan.decoderFail', { msg: e.message })); return; }
  startCamera(localStorage.getItem(LS_CAM) || undefined);
})();

// Sprachwechsel: dynamisch erzeugte Texte neu aufbauen
document.addEventListener('langchange', () => {
  showEngine();
  $('btn-start').textContent = t(idleBtnKey);
  renderHistory();
  if (lastShown && !$('result').hidden) showResult(lastShown.text, lastShown.ts, false);
});
