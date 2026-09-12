/* Kurzlinks anlegen / nachschlagen */
'use strict';

buildTopbar('nav.short');
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
  if (!key) return showErr(t('short.noKey'));
  const btn = $('btn-create'); btn.disabled = true;
  try {
    const r = await fetch('/api/short', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, code: code || undefined, key }),
    });
    if (!r.ok) throw new Error(await apiError(r));
    const j = await r.json();
    localStorage.setItem(LS_KEY, key);
    const link = `${location.origin}/${j.code}`;
    $('link').textContent = link;
    $('target').textContent = url;
    $('btn-qr').href = '/qr?text=' + encodeURIComponent(link);
    $('result').hidden = false;
    $('url').value = ''; $('code').value = '';
    copyText(link, t('short.copied'));
  } catch (e) {
    showErr(e.message || t('unknownErr'));
  } finally { btn.disabled = false; }
});

$('btn-copy').addEventListener('click', () => copyText($('link').textContent, t('short.copied')));

$('btn-lookup').addEventListener('click', async () => {
  const code = $('lookup').value.trim().replace(/^.*\//, '');
  const out = $('lookup-out');
  if (!code) return;
  const r = await fetch('/api/short/' + encodeURIComponent(code));
  if (!r.ok) { out.textContent = t('short.notFound'); return; }
  const j = await r.json();
  out.innerHTML = `→ <span class="mono"></span> · ${tn('short.hits', j.hits)} · ${t('short.created', { date: fmtDateTime(j.created) })}` +
    (j.lastHit ? ` · ${t('short.last', { date: fmtDateTime(j.lastHit) })}` : '');
  out.querySelector('.mono').textContent = j.url;
});
$('lookup').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('btn-lookup').click(); } });
