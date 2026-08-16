/* Geheimnis erstellen */
'use strict';

buildTopbar('Geheimnis');
const $ = (id) => document.getElementById(id);
let currentId = null;

document.querySelectorAll('input[name=mode]').forEach((r) => r.addEventListener('change', () => {
  $('hours-field').hidden = document.querySelector('input[name=mode]:checked').value !== 'hours';
}));

function showErr(msg) { const e = $('err'); e.textContent = msg; e.hidden = !msg; }

$('form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  showErr('');
  const text = $('secret').value;
  if (!text.trim()) return;
  if (text.length > 100000) return showErr('Zu lang (max. ~100 KB)');
  const mode = document.querySelector('input[name=mode]:checked').value;
  const hours = Number($('hours').value);
  const pass = $('pass').value;
  const btn = $('btn-create');
  btn.disabled = true; btn.textContent = 'Verschlüssele …';
  try {
    const { fragment, iv, ct } = await SecretCrypto.encrypt(text, pass);
    const r = await fetch('/api/secret', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ct, iv, mode, hours, pass: !!pass }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || ('Fehler ' + r.status));
    currentId = j.id;
    const link = `${location.origin}/s/${j.id}#${fragment}`;
    $('link').textContent = link;
    $('btn-qr').href = '/qr?text=' + encodeURIComponent(link);
    $('result-hint').textContent = mode === 'once'
      ? 'Der Link funktioniert genau einmal. Ungeöffnet verfällt er nach 7 Tagen.'
      : `Nach dem ersten Öffnen bleibt der Link ${hours < 24 ? hours + ' Stunden' : (hours / 24) + ' Tage'} lesbar, dann wird er gelöscht. Ungeöffnet verfällt er nach 7 Tagen.`;
    if (pass) $('result-hint').textContent += ' Die Passphrase bitte getrennt mitteilen.';
    $('form').hidden = true;
    $('result').hidden = false;
    // Klartext aus dem Formular entfernen
    $('secret').value = ''; $('pass').value = '';
    copyText(link, 'Link kopiert');
  } catch (e) {
    showErr(e.message || 'Unbekannter Fehler');
  } finally {
    btn.disabled = false; btn.textContent = 'Link erzeugen';
  }
});

$('btn-copy').addEventListener('click', () => copyText($('link').textContent, 'Link kopiert'));
$('btn-again').addEventListener('click', () => {
  $('result').hidden = true; $('form').hidden = false; currentId = null; $('secret').focus();
});
$('btn-burn').addEventListener('click', async () => {
  if (!currentId) return;
  await fetch('/api/secret/' + currentId, { method: 'DELETE' });
  toast('Vernichtet');
  $('link').textContent = '— gelöscht —';
  $('btn-copy').disabled = true; $('btn-burn').disabled = true; $('btn-qr').removeAttribute('href');
});
