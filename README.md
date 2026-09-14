<div align="center">

# 🎙️ verbel-ai

### The text-to-speech platform for the whole team.

Paste text, pick a voice, ship natural-sounding audio in seconds — with AI
cleanup, multi-language auto-detection, document import, accounts, and cloud
history built in.

**FastAPI · React + Tailwind · keyless gTTS engine (swap for any neural provider)**

[Features](#-features) · [Live demo flow](#-how-it-works) · [Quickstart](#-quickstart) · [API](#-api-reference) · [Deploy](#-deployment--ci)

</div>

---

## Why verbel-ai

Reading long text is friction. verbel-ai turns any text — pasted, uploaded, or
AI-cleaned — into shareable audio, wrapped in a product experience your users
expect from a modern SaaS: accounts, history, dark mode, an installable app, and
graceful failure everywhere. The core engine is **keyless** (gTTS), so it runs
end-to-end with zero credentials, and every paid integration **degrades
gracefully** when its key is absent.

---

## ✨ Features

### 🎧 Core speech
- **Two engines, one API** *(new)* — a free, keyless **Standard** engine (gTTS) and a premium **Neural** engine (**Mistral Voxtral**, `voxtral-mini-tts-2603`) with 30 expressive, emotion-tagged preset voices. Neural activates automatically when a Mistral key is present and **falls back to Standard** if the provider is busy.
- **Text → speech** in 7 languages on Standard — English, Hindi, Gujarati, Marathi, Spanish, French, German
- **Voice presets** per language (accents + slow mode; neural adds emotions like cheerful, sad, excited, sarcastic)
- **Instant voice preview** — hear a short sample of any voice before you commit *(new)*
- **In-browser player** — play / pause / seek / volume / 0.75×–2× speed
- **Download** any clip as MP3
- **Server-side validation** with clear, mapped HTTP errors

### 🌍 Smart input
- 🪄 **Auto language detection** — paste text in any supported language and verbel-ai picks the language + a default voice for you *(new)*
- 📄 **Document import** — extract text from **PDF / DOCX / TXT** straight into the editor
- ⏸️ **Pause markers** — `[pause]` / `[pause=3]` for natural breaks
- 📊 **Live writing stats** — characters, words, estimated read time, max-length meter

### 🤖 AI assist
- **AI text enhancement** (Mistral) — summarize, fix grammar, rewrite clearer, or make it conversational before speaking
- **Resilient by default** — transient rate-limit / provider hiccups are **auto-retried with exponential backoff**, so free-tier keys "just work" *(new)*

### 👤 Accounts & data
- 🔐 **Supabase auth** — email/password sign-up & login
- ☁️ **Cloud history** — per-user, RLS-protected generation history (falls back to local history when signed out)
- 🔎 **History search + tagging** — filter and label past generations
- ⭐ **Favorite voices** — pinned to the top of the picker

### ⚙️ Platform & scale
- 🧵 **Batch generation** — one clip per line in a single request
- 🚦 **Rate limiting** — per-IP throttling (slowapi) with a `429` handler
- 🔗 **Share** — copy a link to any generated clip
- 📲 **Installable PWA** — offline app shell, add to home screen
- 🌗 **Dark / light theme** with system-preference detection
- ⌨️ **Keyboard shortcut** — `⌘/Ctrl + Enter` to generate
- 🔔 **Toast notifications** and an accessible, reduced-motion-aware UI

---

## 🔬 How it works

```
                    ┌──────────────── React + Tailwind (Vite / PWA) ───────────────┐
  User ── paste ──▶ │  TextInput · Auto-detect · Enhance · Voice preview · Player   │
                    └───────────────────────────┬─────────────────────────────────┘
                                                 │  HTTPS / JSON
                                                 ▼
                    ┌──────────────────────── FastAPI ────────────────────────────┐
                    │  /api/tts · /api/detect-language · /api/enhance · /api/extract │
                    │  /api/auth/* · /api/history   (validation · rate limit · CORS) │
                    └───────┬───────────────┬───────────────┬──────────────┬────────┘
                            ▼               ▼               ▼              ▼
                        gTTS engine     Mistral API     Supabase       PDF/DOCX
                     (audio, keyless)  (retry+backoff)  (auth + DB)    extraction
```

---

## 🚀 Quickstart

**Prerequisites:** Python 3.11+ and Node.js 18+. No API keys required for the core app.

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # optional — sane defaults work out of the box
uvicorn app.main:app --reload
```

Runs at **http://localhost:8000** · interactive OpenAPI docs at **/docs**.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env               # optional — defaults to http://localhost:8000
npm run dev
```

Runs at **http://localhost:5173**.

---

## 🔌 API reference

| Method   | Endpoint                | Description                                       | Auth |
| -------- | ----------------------- | ------------------------------------------------- | ---- |
| `POST`   | `/api/tts`              | Generate speech (rate-limited; `engine` selects gTTS/Voxtral) | —    |
| `POST`   | `/api/tts/batch`        | Generate one clip per text segment                | —    |
| `GET`    | `/api/voices`           | List supported languages and voices               | —    |
| `POST`   | `/api/detect-language`  | Auto-detect the language of text *(new)*          | —    |
| `GET`    | `/api/health`           | Health check                                      | —    |
| `POST`   | `/api/enhance`          | AI text enhancement (Mistral, retry-with-backoff) | —    |
| `POST`   | `/api/extract`          | Extract text from an uploaded PDF/DOCX/TXT        | —    |
| `POST`   | `/api/auth/signup`      | Create an account (Supabase)                      | —    |
| `POST`   | `/api/auth/login`       | Sign in (Supabase)                                | —    |
| `GET`    | `/api/history`          | List the signed-in user's history                 | 🔐   |
| `POST`   | `/api/history`          | Save a generation to cloud history                | 🔐   |
| `PATCH`  | `/api/history/{id}/tags`| Update tags on a history record                   | 🔐   |
| `DELETE` | `/api/history/{id}`     | Delete a history record                           | 🔐   |

**`POST /api/tts`**

```json
// request  (engine defaults to "standard"; use "neural" for Voxtral)
{ "text": "Welcome to our application.", "language": "en",
  "voice": "en-us", "engine": "standard" }
// response  (engine_used may be "standard" if a neural request fell back)
{ "success": true, "audio_url": "/audio/generated-file.mp3",
  "engine_used": "standard" }
```

`GET /api/voices` returns the Standard catalog under `languages` plus a
`neural` block (`{ available, languages }`) listing Voxtral's voices — the
frontend shows the engine toggle only when `neural.available` is `true`.

**`POST /api/detect-language`**

```json
// request
{ "text": "Bonjour, bienvenue dans notre application." }
// response
{ "success": true, "detected_code": "fr", "confidence": 0.99,
  "supported": true, "language_code": "fr", "language_name": "French",
  "voice_id": "fr-fr" }
```

Generated files are served from `/audio/<filename>`.

### Status codes
`200` success · `400` invalid request (empty / too long / bad language or voice /
undetectable text) · `401` unauthorized · `429` too many requests · `503`
upstream provider unavailable · `500` internal error.

---

## ✅ Testing

```bash
cd backend && source .venv/bin/activate && pytest
```

Covers health/voices, successful generation, every validation and
provider-failure path, **language detection** (supported / unsupported /
empty), and the **Mistral retry-with-backoff** logic (retry-then-succeed, give
up after max retries, fail-fast on `401`). External Mistral/Supabase calls are
mocked — no real API calls in the suite.

Frontend: `cd frontend && npm run build`.

---

## 🗂️ Project structure

```
verbel-ai/
├── backend/                          FastAPI service
│   ├── app/
│   │   ├── main.py                   app + CORS + rate limiter + static /audio
│   │   ├── config.py                 env-driven settings
│   │   ├── routers/                  tts, enhance, documents, auth, history
│   │   ├── schemas/                  Pydantic request/response models
│   │   ├── services/
│   │   │   ├── voices.py             language/voice catalog (source of truth)
│   │   │   ├── tts_service.py        gTTS wrapper (Standard engine)
│   │   │   ├── voxtral.py            Mistral Voxtral neural engine  (new)
│   │   │   ├── language_detect.py    langdetect → catalog mapping  (new)
│   │   │   ├── ai_service.py         Mistral REST + retry/backoff   (new)
│   │   │   ├── document_service.py   PDF/DOCX/TXT extraction
│   │   │   └── auth_service.py       Supabase auth + cloud history
│   │   └── generated_audio/          temporary MP3 output
│   ├── db/migrations/                Supabase schema (RLS)
│   └── tests/                        pytest suite
└── frontend/                         React + Vite + Tailwind (PWA)
    └── src/
        ├── App.jsx                   orchestration
        ├── api/client.js             fetch wrapper
        ├── lib/                      auth, cloudHistory, storage
        └── components/               TextInput, LanguageSelector, VoiceSelector,
                                      GenerateButton, AudioPlayer, EnhanceMenu,
                                      DocumentUpload, History, AuthModal, Toast, Header
```

---

## ⚙️ Optional integrations

Every integration below is optional. Without its key, the app keeps running and
the relevant endpoint returns a clean `503` instead of crashing.

| Feature                     | Env vars (backend `.env`)                                            |
| --------------------------- | -------------------------------------------------------------------- |
| AI enhancement              | `MISTRAL_API_KEY`                                                    |
| Neural TTS (Voxtral)        | `MISTRAL_API_KEY` (same key); optional `VOXTRAL_MODEL`              |
| Auth + cloud history        | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`          |

**Supabase schema:** apply `backend/db/migrations/0001_history.sql` and
`0002_tags_and_favorites.sql` (create `speech_history` + tags/favorites with Row
Level Security, so each user only sees their own rows).

> **Provider notes**
> - **Mistral** free-tier keys often return `429`; verbel-ai auto-retries with
>   backoff, but a persistently throttled workspace needs activation/billing in
>   the Mistral console.
> - **Supabase** issues a session token on signup only when *"Confirm email"* is
>   disabled (or after the address is confirmed). Toggle it in
>   **Authentication → Providers → Email** for frictionless local dev.

---

## 🔐 Security

- **No API keys in the frontend** — provider credentials live in the backend `.env` (git-ignored).
- **CORS** locked to the configured frontend origin.
- **All input validated server-side**, with a configurable max length.
- **Per-IP rate limiting** on generation endpoints.
- **Row Level Security** on cloud history; bearer-token verification on every protected route.
- Generated audio is treated as temporary.

---

## 🔄 Engines & swapping providers

Each engine is a self-contained module behind a shared API contract:

- **Standard** — `backend/app/services/tts_service.py` + `voices.py` (gTTS).
- **Neural** — `backend/app/services/voxtral.py` (Mistral Voxtral).

To add another neural provider (ElevenLabs, Azure, Google Cloud, Polly), drop in
a new service module with the same `generate_speech(...)` + catalog shape and
register it in the `/api/tts` engine switch. The API contract, language
detection, and the entire frontend stay unchanged.

---

## 🚢 Deployment & CI

Full step-by-step runbook: **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

- **Backend:** `render.yaml` blueprint (or `backend/Dockerfile`) — runs `uvicorn app.main:app`.
- **Frontend:** `frontend/vercel.json` for Vercel (set `VITE_API_BASE` to the backend URL), or `frontend/Dockerfile`. Ships as an **installable PWA** with offline caching.
- **CI:** `.github/workflows/ci.yml` runs backend `pytest` and a frontend `npm run build` on every push/PR to `main`.

---

## 🗺️ Roadmap
- Voxtral **voice cloning** UI (upload a sample → custom `voice_id`)
- Voice favorites cloud sync
- Multi-speaker "podcast" mode (assign voices per speaker)
- Word-level read-along highlighting
- Live demo deployment

---

## 📄 Tech stack
**Backend:** FastAPI · Pydantic · gTTS · Mistral Voxtral · langdetect · httpx · slowapi · Supabase · Uvicorn · pytest
**Frontend:** React · Vite · Tailwind CSS · lucide-react · vite-plugin-pwa
