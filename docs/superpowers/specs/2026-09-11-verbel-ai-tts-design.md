# verbel-ai — Text-to-Speech App (Design)

Date: 2026-09-11
Status: Approved

## Summary
A web-based Text-to-Speech application. A user enters/pastes text, selects a
language and a voice, generates speech via a TTS provider, then plays the audio
in the browser and optionally downloads it. Includes validation, error
handling, and a health check.

## Decisions
- **Repo:** standalone git repo (`verbel-ai/`), independent of `resoome-it`.
- **Backend:** FastAPI (async, auto Swagger docs, Pydantic validation).
- **TTS provider:** gTTS (free, no API key) to start; provider-swappable.
- **Scope:** Core MVP. Auth, Supabase history, file upload, AI enhancement,
  and rate limiting are deferred.
- **Frontend:** React + Vite + Tailwind.

## gTTS "voice" model
gTTS has no male/female voices; it varies by language, accent (Google TLD) and
a `slow` flag. A "voice" is therefore a named preset `{id, label, tld, slow}`
belonging to a language. This satisfies the spec's `voice` parameter and
`GET /api/voices` contract while keeping the provider swappable — replacing
gTTS with ElevenLabs/Azure later only touches `services/tts_service.py` and the
voice catalog.

## Structure
```
verbel-ai/
├── backend/
│   ├── app/
│   │   ├── main.py            app + CORS + router mount + static /audio
│   │   ├── config.py          pydantic-settings (.env)
│   │   ├── routers/tts.py     POST /api/tts, GET /api/voices, GET /api/health
│   │   ├── schemas/tts.py     Pydantic request/response models
│   │   ├── services/tts_service.py   gTTS wrapper (provider-swappable)
│   │   ├── services/voices.py        voice/language catalog (source of truth)
│   │   └── generated_audio/   temp mp3 output (git-ignored)
│   ├── tests/                 pytest
│   ├── requirements.txt · .env.example · .gitignore
├── frontend/                  React + Vite + Tailwind
│   └── src/  App.jsx · api/client.js · components/*
└── README.md
```

## API contract
- `POST /api/tts` — request `{text, language, voice}` → `{success, audio_url}`
- `GET /api/voices` — `{languages:[{code,name,voices:[{id,label,slow,tld}]}]}`
- `GET /api/health` — `{status:"ok"}`

## Data flow
TextInput (char/word count, max length) → LanguageSelector filters
VoiceSelector → GenerateButton POSTs `{text, language, voice}` → backend
validates → tts_service runs gTTS → writes mp3 to `generated_audio/` → returns
`{success, audio_url:"/audio/<uuid>.mp3"}` → AudioPlayer plays it,
DownloadButton downloads it.

## Validation & errors
- empty text → 400
- text over max length (default 5000, configurable) → 400
- unknown language or voice → 400
- TTS/network failure → 503
- otherwise → 500

Errors return `{success:false, error, detail}` with the matching HTTP code.
Frontend adds client-side empty/too-long guards and renders errors.

## Testing
pytest for backend: health, voices, valid TTS produces a file, and each error
path (empty / too long / bad language / bad voice). Frontend testing is manual
for the MVP.

## Security
No secrets in frontend; `.env` git-ignored with `.env.example` committed; CORS
locked to the frontend origin; server-side input validation; max-length cap;
generated audio treated as temporary.

## Deferred (YAGNI)
Auth, Supabase persistence/history, file upload (TXT/PDF/DOCX), AI text
enhancement, rate limiting. Supabase MCP is already wired for when history is
added.
