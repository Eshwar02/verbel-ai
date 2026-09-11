<div align="center">

# 🎙️ verbel-ai

**Turn any text into natural-sounding speech.**

A full-stack Text-to-Speech web app — FastAPI backend, React + Tailwind frontend, and a keyless gTTS engine you can swap for a neural provider anytime.

</div>

---

## ✨ Features

### Core
- **Text → speech** in 7 languages (English, Hindi, Gujarati, Marathi, Spanish, French, German)
- **Voice presets** per language (accents + slow mode)
- **In-browser playback** with a custom audio player
- **Download** generated audio as MP3
- **Server-side validation** and graceful error handling
- **Health check** endpoint

### Power features
- 🤖 **AI text enhancement** (Mistral) — summarize, fix grammar, rewrite clearer, or make conversational before speaking
- 📄 **Document upload** — extract text from **PDF / DOCX / TXT** and drop it straight into the editor
- 🔐 **Accounts + cloud history** — optional Supabase auth with per-user, RLS-protected generation history (falls back to local history when signed out)
- 🚦 **Rate limiting** — per-IP throttling on generation (slowapi)
- 🔎 **History search + tagging** — filter past generations and label them
- 🧵 **Batch generation** — one clip per line in a single request
- ⏸️ **Pause markers** — `[pause]` / `[pause=3]` for natural breaks
- 🔗 **Share** — copy a link to any generated clip
- 📲 **Installable PWA** — offline app shell, add to home screen

### SaaS-grade touches
- 🌗 **Dark / light theme** with system-preference detection (persisted)
- 📊 **Live stats** — character count, word count, estimated read time, and a max-length progress bar
- ⭐ **Favorite voices** — surfaced to the top of the picker (persisted)
- 🕑 **Recent history** — replay or re-download your last 20 generations (persisted locally)
- 📎 **Drag-and-drop `.txt` upload** to fill the editor
- ✨ **One-click example text**, copy, and clear
- 🎚️ **Playback controls** — seek, volume, and 0.75×–2× speed
- ⌨️ **Keyboard shortcut** — `⌘/Ctrl + Enter` to generate
- 🔔 **Toast notifications** for success and errors

---

## 🏗️ Architecture

```
User → React frontend → FastAPI backend → gTTS → audio → back to the player
```

```
verbel-ai/
├── backend/                     FastAPI service
│   ├── app/
│   │   ├── main.py              app + CORS + static /audio mount
│   │   ├── config.py            env-driven settings
│   │   ├── routers/tts.py       /api/tts, /api/voices, /api/health
│   │   ├── schemas/tts.py       Pydantic request/response models
│   │   ├── services/
│   │   │   ├── voices.py        language/voice catalog (source of truth)
│   │   │   └── tts_service.py   gTTS wrapper (provider-swappable)
│   │   └── generated_audio/     temporary MP3 output
│   └── tests/                   pytest API suite
└── frontend/                    React + Vite + Tailwind
    └── src/
        ├── App.jsx              orchestration
        ├── api/client.js        fetch wrapper
        ├── lib/storage.js       history / favorites / theme
        └── components/          TextInput, LanguageSelector, VoiceSelector,
                                 GenerateButton, AudioPlayer, History, Toast, Header
```

---

## 🚀 Getting started

### Prerequisites
- Python 3.11+
- Node.js 18+

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # optional — sane defaults work out of the box
uvicorn app.main:app --reload
```

Backend runs at **http://localhost:8000** · interactive docs at **/docs**.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env               # optional — defaults to http://localhost:8000
npm run dev
```

Frontend runs at **http://localhost:5173**.

---

## 🔌 API

| Method   | Endpoint             | Description                                   |
| -------- | -------------------- | --------------------------------------------- |
| `POST`   | `/api/tts`           | Generate speech from text (rate-limited)      |
| `GET`    | `/api/voices`        | List supported languages and voices           |
| `GET`    | `/api/health`        | Health check                                  |
| `POST`   | `/api/enhance`       | AI text enhancement (Mistral)                 |
| `POST`   | `/api/extract`       | Extract text from an uploaded PDF/DOCX/TXT    |
| `POST`   | `/api/auth/signup`   | Create an account (Supabase)                  |
| `POST`   | `/api/auth/login`    | Sign in (Supabase)                            |
| `GET`    | `/api/history`       | List the signed-in user's history            |
| `POST`   | `/api/history`       | Save a generation to cloud history            |
| `DELETE` | `/api/history/{id}`  | Delete a history record                       |

**`POST /api/tts`**

```json
// request
{ "text": "Welcome to our application.", "language": "en", "voice": "en-us" }

// response
{ "success": true, "audio_url": "/audio/generated-file.mp3" }
```

Generated files are served from `/audio/<filename>`.

### Status codes
`200` success · `400` invalid request (empty / too long / bad language or voice) · `503` TTS provider unavailable · `500` internal error.

---

## ✅ Testing

```bash
cd backend
source .venv/bin/activate
pytest
```

Covers the health and voices endpoints, a successful generation, and every
validation and provider-failure path.

---

## 🔐 Security notes
- No API keys in the frontend — provider credentials live in the backend `.env` (git-ignored).
- CORS is locked to the configured frontend origin.
- All input is validated server-side, with a configurable max length.
- Generated audio is treated as temporary.

---

## 🔄 Swapping the TTS provider

gTTS is free and keyless but limited to accent/slow presets (no distinct
male/female voices). To move to a neural provider (ElevenLabs, Azure, Google
Cloud, Polly), rewrite `backend/app/services/tts_service.py` and update the
catalog in `backend/app/services/voices.py`. The API contract and the entire
frontend stay unchanged.

---

## ⚙️ Optional integrations

These features degrade gracefully — the app runs without them, returning `503` if called while unconfigured.

| Feature            | Env vars (backend `.env`)                              |
| ------------------ | ------------------------------------------------------ |
| AI enhancement     | `MISTRAL_API_KEY`                                      |
| Auth + cloud history | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY` |

**Supabase schema:** apply `backend/db/migrations/0001_history.sql` (creates `speech_history` with Row Level Security so each user only sees their own rows).

## 🚢 Deployment & CI

Full step-by-step runbook: **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

- **Backend:** `render.yaml` blueprint (or `backend/Dockerfile`) — runs `uvicorn app.main:app`.
- **Frontend:** `frontend/vercel.json` for Vercel (set `VITE_API_BASE` to the backend URL), or `frontend/Dockerfile`. Ships as an **installable PWA** with offline caching.
- **CI:** `.github/workflows/ci.yml` runs backend `pytest` and a frontend `npm run build` on every push/PR to `main`.

## 🗺️ Roadmap
- Favorites/voice cloud sync
- Speech-history search + tagging
- Deploy live demo

---

## 📄 Tech stack
**Backend:** FastAPI · Pydantic · gTTS · Uvicorn · pytest
**Frontend:** React · Vite · Tailwind CSS · lucide-react
