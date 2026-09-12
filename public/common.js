/* Gemeinsames für alle Toolbox-Seiten: Menüleiste, Theme, Toast, Clipboard. */
'use strict';

const LS_THEME = 'tools.martuni.theme';

const ICONS = {
  logo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0 5 5L22 9l-1-3-3-1zM12.5 8.5 4 17a2.1 2.1 0 0 0 3 3l8.5-8.5"/></svg>',
  moon: '<svg class="ic-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg>',
  sun: '<svg class="ic-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M4 19h16"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.5 20h19z"/><path d="M12 9.5v5M12 17.5v.5"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c4.4 0 7-3 7-6.5 0-3.6-2.5-5.5-3.5-8.5-1 1.5-1.5 2.5-1.5 4-1.5-2-1.6-4.5-1-7C9.5 6 5 9.5 5 15.5 5 19 7.6 22 12 22z"/></svg>',
};

const PAGES = [
  { href: '/qr', label: 'QR erstellen' },
  { href: '/scan', label: 'QR scannen' },
  { href: '/secret', label: 'Geheimnis' },
  { href: '/short', label: 'Kurzlink' },
];

function buildTopbar(crumb) {
  const path = location.pathname.replace(/\/$/, '') || '/';
  const bar = document.createElement('header');
  bar.className = 'topbar';
  bar.innerHTML =
    `<a class="brand" href="/">${ICONS.logo}Toolbox</a>` +
    (crumb ? `<span class="crumb">${crumb}</span>` : '') +
    '<div class="topbar-spacer"></div>' +
    '<nav class="topnav">' + PAGES.map((p) =>
      `<a href="${p.href}"${path === p.href ? ' aria-current="page"' : ''}>${p.label}</a>`).join('') + '</nav>' +
    `<button class="icon-btn" id="btn-theme" title="Hell / Dunkel umschalten">${ICONS.moon}${ICONS.sun}</button>`;
  document.body.prepend(bar);
  bar.querySelector('#btn-theme').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    if (dark) { delete document.documentElement.dataset.theme; localStorage.setItem(LS_THEME, 'light'); }
    else { document.documentElement.dataset.theme = 'dark'; localStorage.setItem(LS_THEME, 'dark'); }
  });
}

(function initTheme() {
  const t = localStorage.getItem(LS_THEME);
  if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.dataset.theme = 'dark';
  }
})();

let toastTimer;
function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.append(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

async function copyText(text, msg = 'Kopiert') {
  try {
    await navigator.clipboard.writeText(text);
    toast(msg);
    return true;
  } catch (e) {
    // Fallback (unsichere Kontexte / alte Browser)
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.append(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    toast(ok ? msg : 'Kopieren nicht möglich');
    return ok;
  }
}

function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
  }
  n.append(...children.flat().filter((c) => c != null));
  return n;
}

/* Base64url <-> Bytes */
const b64u = {
  enc(bytes) {
    let s = '';
    for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  dec(str) {
    const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  },
};

function fmtDateTime(ms) {
  return new Date(ms).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}
