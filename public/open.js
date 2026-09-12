/* Geheimnis öffnen: /s/<id>#<key> */
'use strict';

buildTopbar('nav.secret');
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
  return hours < 24 ? tn('hours', hours) : tn('days', hours / 24);
}

function confirmNote() {
  const note = $('confirm-note');
  if (meta.mode === 'once') note.innerHTML = `${ICONS.warn}<span>${t('open.onceNote')}</span>`;
  else if (meta.opened) note.innerHTML = `${ICONS.info}<span>${t('open.openedNote', { date: fmtDateTime(meta.expiresAt) })}</span>`;
  else note.innerHTML = `${ICONS.warn}<span>${t('open.deadlineNote', { span: fristText(meta.hours) })}</span>`;
}

let shown = null;   // Antwort von /open, sobald angezeigt (für den Hinweistext)
let burned = false;
function showNote() {
  const note = $('show-note');
  if (burned) note.innerHTML = `${ICONS.flame}<span>${t('open.burnedShort')}</span>`;
  else if (shown.mode === 'once') note.innerHTML = `${ICONS.flame}<span>${t('open.burnedNote')}</span>`;
  else { note.innerHTML = `${ICONS.info}<span>${t('open.readableUntil', { date: fmtDateTime(shown.expiresAt) })}</span>`; tick(shown.expiresAt); }
}

async function init() {
  if (!id || !fragment) return stage('gone');
  let r;
  try { r = await fetch('/api/secret/' + id, { cache: 'no-store' }); } catch (e) { return stage('gone'); }
  if (!r.ok) return stage('gone');
  meta = await r.json();
  confirmNote();
  $('pass-field').hidden = !meta.pass;
  stage('confirm');
  if (meta.pass) $('pass').focus(); else $('btn-open').focus();
}

let cached = null;   // Chiffrat nach dem Abruf (für weitere Passphrase-Versuche bei "once")

$('btn-open').addEventListener('click', async () => {
  showErr('');
  const pass = $('pass').value;
  if (meta.pass && !pass) return showErr(t('open.needPass'));
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
      showErr(t(cached.mode === 'once' ? 'open.decryptFailOnce' : 'open.decryptFail'));
      return;
    }
    reveal(cached);
  } catch (e) {
    showErr(t('open.err', { msg: e.message || e }));
  } finally {
    btn.disabled = false;
  }
});

function reveal(j) {
  $('secret').textContent = plain;
  shown = j;
  showNote();
  if (j.mode !== 'once') {
    $('btn-burn').hidden = false;
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
  if (cd) cd.textContent = t('open.remaining', { time: `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` });
  if (expiresAt <= Date.now()) { clearInterval(timer); }
}

$('btn-copy').addEventListener('click', () => copyText(plain));
$('btn-burn').addEventListener('click', async () => {
  await fetch('/api/secret/' + id, { method: 'DELETE' });
  toast(t('secret.burned'));
  $('btn-burn').disabled = true;
  clearInterval(timer);
  burned = true;
  showNote();
});

document.addEventListener('langchange', () => {
  if (meta && !$('stage-confirm').hidden) confirmNote();
  if (shown && !$('stage-show').hidden) showNote();
});
$('pass').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btn-open').click(); });

init();
