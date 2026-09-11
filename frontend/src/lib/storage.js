/** Thin localStorage helpers for history, favorite voices, and theme. */

const HISTORY_KEY = "verbel.history";
const FAVORITES_KEY = "verbel.favorites";
const THEME_KEY = "verbel.theme";
const MAX_HISTORY = 20;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

// --- History ---
export function loadHistory() {
  return read(HISTORY_KEY, []);
}

export function addHistory(entry) {
  const history = loadHistory();
  const next = [entry, ...history].slice(0, MAX_HISTORY);
  write(HISTORY_KEY, next);
  return next;
}

export function clearHistory() {
  write(HISTORY_KEY, []);
  return [];
}

/** Replace the tag list on one local history entry. */
export function setHistoryTags(id, tags) {
  const history = loadHistory().map((h) =>
    h.id === id ? { ...h, tags } : h
  );
  write(HISTORY_KEY, history);
  return history;
}

/** Remove one local history entry by id. */
export function removeHistory(id) {
  const history = loadHistory().filter((h) => h.id !== id);
  write(HISTORY_KEY, history);
  return history;
}

// --- Favorite voices ---
export function loadFavorites() {
  return read(FAVORITES_KEY, []);
}

export function toggleFavorite(voiceId) {
  const favs = loadFavorites();
  const next = favs.includes(voiceId)
    ? favs.filter((id) => id !== voiceId)
    : [...favs, voiceId];
  write(FAVORITES_KEY, next);
  return next;
}

// --- Theme ---
export function loadTheme() {
  const stored = read(THEME_KEY, null);
  if (stored) return stored;
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function saveTheme(theme) {
  write(THEME_KEY, theme);
}
