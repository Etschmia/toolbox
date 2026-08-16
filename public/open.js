/* Geheimnis öffnen: /s/<id>#<key> */
'use strict';

buildTopbar('Geheimnis');
const $ = (id) => document.getElementById(id);
const id = (location.pathname.match(/^\/s\/([A-Za-z0-9]{12})$/) || [])[1];
const fragment = location.hash.slice(1);
let meta = null;
let plain = null;
let timer = null;

function stage(name) {
  for (const s of ['loading', 'confirm', 'show', 'gone']) $('stage-' + s).hidden = s !== name;
}
function showErr(msg) { const e = $('err'); e.textContent = msg; e.hidden = !msg; }

function fristText(hours) {
  return hours < 24 ? `${hours} Stunde${hours === 1 ? '' : 'n'}` : `${hours / 24} Tag${hours === 24 ? '' : 'e'}`;
}

async function init() {
  if (!id || !fragment) return stage('gone');
  let r;
  try { r = await fetch('/api/secret/' + id, { cache: 'no-store' }); } catch (e) { return stage('gone'); }
  if (!r.ok) return stage('gone');
  meta = await r.json();
  const note = $('confirm-note');
  if (meta.mode === 'once') {
    note.innerHTML = `${ICONS.warn}<span><b>Nur einmal lesbar.</b> Sobald du auf „Anzeigen" klickst, wird das Geheimnis vom Server gelöscht. Danach kann es niemand mehr öffnen — auch du nicht. Bereit?</span>`;
  } else if (meta.opened) {
    note.innerHTML = `${ICONS.info}<span>Dieses Geheimnis wurde bereits geöffnet und ist noch bis <b>${fmtDateTime(meta.expiresAt)}</b> lesbar.</span>`;
  } else {
    note.innerHTML = `${ICONS.warn}<span><b>Frist startet beim Öffnen.</b> Ab dem ersten Anzeigen bleibt das Geheimnis ${fristText(meta.hours)} lesbar, danach wird es gelöscht.</span>`;
  }
  $('pass-field').hidden = !meta.pass;
  stage('confirm');
  if (meta.pass) $('pass').focus(); else $('btn-open').focus();
}

let cached = null;   // Chiffrat nach dem Abruf (für weitere Passphrase-Versuche bei "once")

$('btn-open').addEventListener('click', async () => {
  showErr('');
  const pass = $('pass').value;
  if (meta.pass && !pass) return showErr('Bitte die Passphrase eingeben.');
  const btn = $('btn-open');
  btn.disabled = true;
  try {
    if (!cached) {
      const r = await fetch('/api/secret/' + id + '/open', { method: 'POST', cache: 'no-store' });
      if (!r.ok) { stage('gone'); return; }
      cached = await r.json();
    }
    try {
      plain = await SecretCrypto.decrypt(fragment, cached.iv, cached.ct, pass);
    } catch (e) {
      // Bei "once" ist das Chiffrat serverseitig schon weg — es lebt jetzt nur noch
      // in `cached`; deshalb Seite nicht neu laden, sondern erneut versuchen lassen.
      showErr(cached.mode === 'once'
        ? 'Entschlüsselung fehlgeschlagen — Passphrase falsch? Bitte erneut versuchen und diese Seite dabei nicht neu laden.'
        : 'Entschlüsselung fehlgeschlagen — Passphrase falsch?');
      return;
    }
    reveal(cached);
  } catch (e) {
    showErr('Fehler: ' + (e.message || e));
  } finally {
    btn.disabled = false;
  }
});

function reveal(j) {
  $('secret').textContent = plain;
  const note = $('show-note');
  if (j.mode === 'once') {
    note.innerHTML = `${ICONS.flame}<span>Das Geheimnis wurde vom Server gelöscht. Es existiert jetzt nur noch hier auf deinem Bildschirm.</span>`;
  } else {
    note.innerHTML = `${ICONS.info}<span>Lesbar bis <b>${fmtDateTime(j.expiresAt)}</b> (<span class="countdown" id="cd"></span>). Danach wird es gelöscht.</span>`;
    $('btn-burn').hidden = false;
    tick(j.expiresAt);
    timer = setInterval(() => tick(j.expiresAt), 1000);
  }
  stage('show');
  // Einmal-Geheimnis: Schlüssel aus Adresszeile/History nehmen (Link ist ohnehin tot).
  // Frist-Modus: Link bleibt, damit Neuladen/Lesezeichen weiter funktionieren.
  if (j.mode === 'once') history.replaceState(null, '', location.pathname);
}

function tick(expiresAt) {
  let s = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  const cd = $('cd');
  if (cd) cd.textContent = `noch ${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  if (expiresAt <= Date.now()) { clearInterval(timer); }
}

$('btn-copy').addEventListener('click', () => copyText(plain, 'Kopiert'));
$('btn-burn').addEventListener('click', async () => {
  await fetch('/api/secret/' + id, { method: 'DELETE' });
  toast('Vernichtet');
  $('btn-burn').disabled = true;
  clearInterval(timer);
  $('show-note').innerHTML = `${ICONS.flame}<span>Vom Server gelöscht. Existiert nur noch hier auf deinem Bildschirm.</span>`;
});
$('pass').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btn-open').click(); });

init();
