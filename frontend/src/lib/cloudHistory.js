/** Cloud history via the backend, using the stored access token.
 *
 * App calls these when a user is logged in; otherwise it falls back to the
 * local `storage.js` helpers. This module only exports the functions — wiring
 * is done in App. Records are normalized to the same shape the local history
 * uses so the UI can render either source interchangeably.
 */

import { getToken } from "./auth";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function parseError(res) {
  try {
    const data = await res.json();
    return data.detail || data.error || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

function authHeaders() {
  const token = getToken();
  if (!token) throw new Error("Not authenticated.");
  return { Authorization: `Bearer ${token}` };
}

/** Save a generation to the cloud. Returns the stored record. */
export async function saveHistory({ textPreview, language, voice, audioUrl }) {
  const res = await fetch(`${API_BASE}/api/history`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      text_preview: textPreview,
      language,
      voice,
      audio_url: audioUrl,
    }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const body = await res.json();
  return body.record;
}

/** List the current user's history, newest first. */
export async function listHistory() {
  const res = await fetch(`${API_BASE}/api/history`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(await parseError(res));
  const body = await res.json();
  return body.records ?? [];
}

/** Replace the tags on one history record. */
export async function setTags(id, tags) {
  const res = await fetch(`${API_BASE}/api/history/${id}/tags`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ tags }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const body = await res.json();
  return body.record;
}

/** Delete one history record by id. */
export async function deleteHistory(id) {
  const res = await fetch(`${API_BASE}/api/history/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return true;
}
