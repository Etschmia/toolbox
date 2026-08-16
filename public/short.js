/* Kurzlinks anlegen / nachschlagen */
'use strict';

buildTopbar('Kurzlink');
const $ = (id) => document.getElementById(id);
const LS_KEY = 'tools.martuni.shortkey';

$('key').value = localStorage.getItem(LS_KEY) || '';
function showErr(msg) { const e = $('err'); e.textContent = msg; e.hidden = !msg; }

$('form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  showErr('');
  const url = $('url').value.trim();
  const code = $('code').value.trim();
  const key = $('key').value;
  if (!key) return showErr('Ohne Schlüssel geht es nicht.');
  const btn = $('btn-create'); btn.disabled = true;
  try {
    const r = await fetch('/api/short', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, code: code || undefined, key }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || ('Fehler ' + r.status));
    localStorage.setItem(LS_KEY, key);
    const link = `${location.origin}/${j.code}`;
    $('link').textContent = link;
    $('target').textContent = url;
    $('btn-qr').href = '/qr?text=' + encodeURIComponent(link);
    $('result').hidden = false;
    $('url').value = ''; $('code').value = '';
    copyText(link, 'Kurzlink kopiert');
  } catch (e) {
    showErr(e.message || 'Unbekannter Fehler');
  } finally { btn.disabled = false; }
});

$('btn-copy').addEventListener('click', () => copyText($('link').textContent, 'Kurzlink kopiert'));

$('btn-lookup').addEventListener('click', async () => {
  const code = $('lookup').value.trim().replace(/^.*\//, '');
  const out = $('lookup-out');
  if (!code) return;
  const r = await fetch('/api/short/' + encodeURIComponent(code));
  if (!r.ok) { out.textContent = 'Kein Kurzlink mit diesem Kürzel.'; return; }
  const j = await r.json();
  out.innerHTML = `→ <span class="mono"></span> · ${j.hits} Aufruf${j.hits === 1 ? '' : 'e'} · angelegt ${fmtDateTime(j.created)}` +
    (j.lastHit ? ` · zuletzt ${fmtDateTime(j.lastHit)}` : '');
  out.querySelector('.mono').textContent = j.url;
});
$('lookup').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('btn-lookup').click(); } });
