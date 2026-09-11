const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

/** Turn a backend-relative path (e.g. /audio/x.mp3) into an absolute URL. */
export function absoluteUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}

async function parseError(res) {
  try {
    const data = await res.json();
    return data.detail || data.error || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export async function fetchVoices() {
  const res = await fetch(`${API_BASE}/api/voices`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function generateSpeech({ text, language, voice }) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language, voice }),
    });
  } catch {
    throw new Error("Network error — is the backend running?");
  }
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
