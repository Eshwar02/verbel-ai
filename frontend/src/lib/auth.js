/** Auth helpers: sign up / log in via the backend, token + user in localStorage. */

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const TOKEN_KEY = "verbel.token";
const USER_KEY = "verbel.user";

async function parseError(res) {
  try {
    const data = await res.json();
    return data.detail || data.error || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

async function post(path, body) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Network error — is the backend running?");
  }
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/** Persist the session returned by the backend. Returns the user object. */
function persistSession(session) {
  if (session?.access_token) {
    localStorage.setItem(TOKEN_KEY, session.access_token);
  }
  if (session?.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  }
  return session?.user ?? null;
}

/** Create an account. Returns the user (may be null if email confirmation on). */
export async function signUp(email, password) {
  const session = await post("/api/auth/signup", { email, password });
  return persistSession(session);
}

/** Log in with email + password. Returns the user object. */
export async function logIn(email, password) {
  const session = await post("/api/auth/login", { email, password });
  return persistSession(session);
}

/** Current access token, or null. */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/** Current user object, or null. */
export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** True when a token is present. */
export function isLoggedIn() {
  return Boolean(getToken());
}

/** Clear the stored session. */
export function logOut() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
