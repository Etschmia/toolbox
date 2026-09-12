/* QR-Code-Generator — rein clientseitig (lib/qrcode.js, Kazuhiko Arase, MIT). */
'use strict';

buildTopbar('nav.qr');
qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

const $ = (id) => document.getElementById(id);
const canvas = $('canvas');
const ctx = canvas.getContext('2d');
let current = null;   // { qr, text }
let renderTimer;

/* --- Eingabe je Art zu einem String zusammenbauen --- */
function kind() { return document.querySelector('input[name=kind]:checked').value; }

function wifiEsc(s) { return s.replace(/([\\;,:"])/g, '\\$1'); }

function buildText() {
  const k = kind();
  if (k === 'text') return $('text').value.trim();
  if (k === 'bitcoin') {
    const addr = $('btc-addr').value.trim();
    if (!addr) return '';
    const params = [];
    const amount = $('btc-amount').value.trim().replace(',', '.');
    if (amount && Number(amount) > 0) params.push('amount=' + Number(amount));
    const label = $('btc-label').value.trim();
    if (label) params.push('label=' + encodeURIComponent(label));
    return 'bitcoin:' + addr + (params.length ? '?' + params.join('&') : '');
  }
  if (k === 'wifi') {
    const ssid = $('wifi-ssid').value;
    if (!ssid) return '';
    const type = $('wifi-type').value;
    let s = `WIFI:T:${type};S:${wifiEsc(ssid)};`;
    if (type !== 'nopass') s += `P:${wifiEsc($('wifi-pass').value)};`;
    if ($('wifi-hidden').checked) s += 'H:true;';
    return s + ';';
  }
  return '';
}

/* --- Rendern --- */
function makeQr(text, ecl) {
  const qr = qrcode(0, ecl);       // 0 = Typ automatisch wählen
  qr.addData(text, 'Byte');
  qr.make();
  return qr;
}

function drawToCanvas(qr, cv, sizePx, margin) {
  const n = qr.getModuleCount();
  const total = n + margin * 2;
  const cell = Math.max(1, Math.floor(sizePx / total));
  const px = cell * total;
  cv.width = px; cv.height = px;
  const c = cv.getContext('2d');
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, px, px);
  c.fillStyle = '#000000';
  for (let r = 0; r < n; r++) {
    for (let col = 0; col < n; col++) {
      if (qr.isDark(r, col)) c.fillRect((col + margin) * cell, (r + margin) * cell, cell, cell);
    }
  }
  return cv;
}

function toSvg(qr, margin) {
  const n = qr.getModuleCount();
  const total = n + margin * 2;
  let d = '';
  for (let r = 0; r < n; r++) {
    let run = 0;
    for (let col = 0; col <= n; col++) {
      const dark = col < n && qr.isDark(r, col);
      if (dark) run++;
      else if (run) { d += `M${col - run + margin} ${r + margin}h${run}v1h-${run}z`; run = 0; }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
    `<rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

function render() {
  const text = buildText();
  const btns = ['btn-copy-img', 'btn-png', 'btn-svg', 'btn-copy-text'].map($);
  if (!text) {
    current = null;
    canvas.width = canvas.height = 256;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 256, 256);
    $('meta').textContent = t('qr.empty');
    btns.forEach((b) => b.disabled = true);
    return;
  }
  const ecl = document.querySelector('input[name=ecl]:checked').value;
  let qr;
  try { qr = makeQr(text, ecl); } catch (e) {
    current = null;
    $('meta').textContent = t('qr.tooLong', { n: text.length });
    btns.forEach((b) => b.disabled = true);
    return;
  }
  current = { qr, text };
  drawToCanvas(qr, canvas, 512, Number($('margin').value));
  const n = qr.getModuleCount();
  $('meta').textContent = t('qr.meta', { v: (n - 17) / 4, n, len: text.length, ecl });
  btns.forEach((b) => b.disabled = false);
}

function scheduleRender() { clearTimeout(renderTimer); renderTimer = setTimeout(render, 80); }

/* --- Export --- */
function exportCanvas() {
  const cv = document.createElement('canvas');
  return drawToCanvas(current.qr, cv, Number($('size').value), Number($('margin').value));
}
function canvasBlob(cv) { return new Promise((ok) => cv.toBlob(ok, 'image/png')); }
function fileStem() {
  const k = kind();
  return 'qr-' + (k === 'bitcoin' ? 'bitcoin' : k === 'wifi' ? 'wlan' : 'code');
}
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

$('btn-copy-img').addEventListener('click', async () => {
  if (!current) return;
  try {
    // ClipboardItem mit Promise<Blob>: Safari verlangt, dass write() direkt
    // in der Nutzeraktion passiert — deshalb kein await vor dem write.
    const item = new ClipboardItem({ 'image/png': canvasBlob(exportCanvas()) });
    await navigator.clipboard.write([item]);
    toast(t('qr.imgCopied'));
  } catch (e) {
    console.warn(e);
    toast(t('qr.imgCopyFail'));
  }
});
$('btn-png').addEventListener('click', async () => {
  if (!current) return;
  download(await canvasBlob(exportCanvas()), fileStem() + '.png');
});
$('btn-svg').addEventListener('click', () => {
  if (!current) return;
  download(new Blob([toSvg(current.qr, Number($('margin').value))], { type: 'image/svg+xml' }), fileStem() + '.svg');
});
$('btn-copy-text').addEventListener('click', () => current && copyText(current.text, t('qr.textCopied')));

/* --- Verdrahtung --- */
document.querySelectorAll('input[name=kind]').forEach((r) => r.addEventListener('change', () => {
  for (const k of ['text', 'bitcoin', 'wifi']) $('pane-' + k).hidden = kind() !== k;
  render();
}));
document.querySelectorAll('input, textarea, select').forEach((i) => {
  i.addEventListener('input', scheduleRender);
  i.addEventListener('change', scheduleRender);
});
$('size').addEventListener('input', () => $('size-out').textContent = $('size').value + ' px');
$('margin').addEventListener('input', () => $('margin-out').textContent = $('margin').value);

// ?text=… vorbelegen (z. B. aus anderen Tools)
const pre = new URLSearchParams(location.search).get('text');
if (pre) $('text').value = pre;
render();
document.addEventListener('langchange', render);
