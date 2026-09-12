/* Geheimnis erstellen */
'use strict';

buildTopbar('nav.secret');
const $ = (id) => document.getElementById(id);
let currentId = null;
let lastResult = null; // { mode, hours, pass } — für den Hinweistext beim Sprachwechsel

function spanText(hours) { return hours < 24 ? tn('hours', hours) : tn('days', hours / 24); }
function resultHint() {
  if (!lastResult) return;
  const { mode, hours, pass } = lastResult;
  $('result-hint').textContent = (mode === 'once' ? t('secret.onceHint') : t('secret.hoursHint', { span: spanText(hours) })) +
    (pass ? ' ' + t('secret.passSeparately') : '');
}

document.querySelectorAll('input[name=mode]').forEach((r) => r.addEventListener('change', () => {
  $('hours-field').hidden = document.querySelector('input[name=mode]:checked').value !== 'hours';
}));

function showErr(msg) { const e = $('err'); e.textContent = msg; e.hidden = !msg; }

$('form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  showErr('');
  const text = $('secret').value;
  if (!text.trim()) return;
  if (text.length > 100000) return showErr(t('secret.tooLong'));
  const mode = document.querySelector('input[name=mode]:checked').value;
  const hours = Number($('hours').value);
  const pass = $('pass').value;
  const btn = $('btn-create');
  btn.disabled = true; btn.textContent = t('secret.encrypting');
  try {
    const { fragment, iv, ct } = await SecretCrypto.encrypt(text, pass);
    const r = await fetch('/api/secret', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ct, iv, mode, hours, pass: !!pass }),
    });
    if (!r.ok) throw new Error(await apiError(r));
    const j = await r.json();
    currentId = j.id;
    const link = `${location.origin}/s/${j.id}#${fragment}`;
    $('link').textContent = link;
    $('btn-qr').href = '/qr?text=' + encodeURIComponent(link);
    lastResult = { mode, hours, pass: !!pass };
    resultHint();
    $('form').hidden = true;
    $('result').hidden = false;
    // Klartext aus dem Formular entfernen
    $('secret').value = ''; $('pass').value = '';
    copyText(link, t('secret.linkCopied'));
  } catch (e) {
    showErr(e.message || t('unknownErr'));
  } finally {
    btn.disabled = false; btn.textContent = t('secret.create');
  }
});

$('btn-copy').addEventListener('click', () => copyText($('link').textContent, t('secret.linkCopied')));
$('btn-again').addEventListener('click', () => {
  $('result').hidden = true; $('form').hidden = false; currentId = null; $('secret').focus();
});
$('btn-burn').addEventListener('click', async () => {
  if (!currentId) return;
  await fetch('/api/secret/' + currentId, { method: 'DELETE' });
  toast(t('secret.burned'));
  $('link').textContent = t('secret.deleted');
  $('btn-copy').disabled = true; $('btn-burn').disabled = true; $('btn-qr').removeAttribute('href');
});

document.addEventListener('langchange', resultHint);
