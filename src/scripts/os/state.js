// Estado do sistema: preferências guardadas no dispositivo, relógio e
// o modo (Mac ou telefone). Nada aqui toca no DOM das aplicações.

const KEY = 'helderos';

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch (_) {
    return {};
  }
};

const write = (value) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch (_) {
    /* modo privado: as preferências valem só para esta sessão */
  }
};

export const prefs = Object.assign(
  { theme: 'auto', wallpaper: 'aurora', brightness: 100, motion: 'on' },
  read()
);

export function setPref(key, value) {
  prefs[key] = value;
  write(prefs);
  applyPrefs();
}

export function resetPrefs() {
  try {
    localStorage.removeItem(KEY);
  } catch (_) {}
}

export function applyPrefs() {
  const root = document.documentElement;
  if (prefs.theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', prefs.theme);
  root.setAttribute('data-wallpaper', prefs.wallpaper);
  root.setAttribute('data-motion', prefs.motion);
  root.style.setProperty('--brightness', String(prefs.brightness));
  document.querySelectorAll('.cc-slider .fill').forEach((el) => {
    el.style.height = prefs.brightness + '%';
  });
}

/** O tema realmente em vigor, contando com a preferência do sistema. */
export function effectiveTheme() {
  if (prefs.theme !== 'auto') return prefs.theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const reducedMotion = () =>
  prefs.motion === 'off' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Modo ──────────────────────────────────────────────────────
const phoneQuery = window.matchMedia('(max-width: 860px), (pointer: coarse) and (max-width: 1180px)');

export const forcedPhone = new URLSearchParams(location.search).has('device');

export const detectMode = () => (forcedPhone || phoneQuery.matches ? 'ios' : 'mac');

export function onModeChange(handler) {
  const listener = () => handler(detectMode());
  if (phoneQuery.addEventListener) phoneQuery.addEventListener('change', listener);
  else phoneQuery.addListener(listener);
}

// ── Relógio ───────────────────────────────────────────────────
export function startClock(locale) {
  const macFmt = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const timeFmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  const dateFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: 'long' });

  const tick = () => {
    const now = new Date();
    const time = timeFmt.format(now);
    document.querySelectorAll('[data-clock-mac]').forEach((el) => (el.textContent = macFmt.format(now)));
    document.querySelectorAll('[data-clock-ios]').forEach((el) => (el.textContent = time));
    document.querySelectorAll('[data-lock-time]').forEach((el) => (el.textContent = time));
    document.querySelectorAll('[data-lock-date]').forEach((el) => (el.textContent = dateFmt.format(now)));
    document.querySelectorAll('[data-widget-day]').forEach((el) => (el.textContent = dayFmt.format(now)));
    document.querySelectorAll('[data-widget-date]').forEach((el) => (el.textContent = String(now.getDate())));
    const icDia = document.getElementById('ic-calendario-dia');
    if (icDia) icDia.textContent = String(now.getDate());
  };

  tick();
  lastTick = tick;
  setInterval(tick, 15000);
}

let lastTick = () => {};
/** Escreve a hora já: para um widget acabado de nascer não esperar 15 s. */
export const refreshClock = () => lastTick();

// ── Sessão (arranque e bloqueio só uma vez) ───────────────────
/** Esquece o sinal: o próximo arranque volta a ser o primeiro. */
export function forgetSession(flag) {
  try {
    sessionStorage.removeItem(flag);
  } catch (_) {}
}

export function seenThisSession(flag) {
  try {
    if (sessionStorage.getItem(flag)) return true;
    sessionStorage.setItem(flag, '1');
    return false;
  } catch (_) {
    return true;
  }
}
