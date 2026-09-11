# Deploying verbel-ai

Two pieces: the **FastAPI backend** and the **React (Vite) frontend**. Deploy the
backend first, then point the frontend at its URL.

---

## 1. Backend → Render

The repo ships a Render blueprint at [`render.yaml`](./render.yaml).

**Option A — Blueprint (recommended):**
1. Push to GitHub (already done: `Eshwar02/verbel-ai`).
2. In the Render dashboard: **New → Blueprint**, select this repo. Render reads
   `render.yaml` and creates the `verbel-ai-backend` web service.
3. Set the env vars (all declared `sync: false`, so you fill them in the dashboard):
   | Var | Value |
   |-----|-------|
   | `MAX_TEXT_LENGTH` | `5000` |
   | `CORS_ORIGINS` | your frontend URL, e.g. `https://verbel-ai.vercel.app` |
   | `MISTRAL_API_KEY` | your Mistral key (optional — `/api/enhance` 503s without it) |
   | `SUPABASE_URL` | `https://acaqzsepdvwhwdcvvbxs.supabase.co` |
   | `SUPABASE_ANON_KEY` | project anon key |
   | `SUPABASE_SERVICE_KEY` | project **service_role** secret |
4. Deploy. Health check: `https://<service>.onrender.com/api/health` → `{"status":"ok"}`.

**Option B — Docker:** `backend/Dockerfile` builds a runnable image
(`uvicorn app.main:app`). Deploy it anywhere that runs containers.

> **CORS:** set `CORS_ORIGINS` to the exact frontend origin, or the browser will
> block requests.

---

## 2. Frontend → Vercel

`frontend/vercel.json` provides the SPA config.

```bash
cd frontend
vercel login            # interactive, one time
vercel link             # link/create the project
# Set the backend URL for production builds:
vercel env add VITE_API_BASE production   # paste https://<service>.onrender.com
vercel --prod
```

`VITE_API_BASE` is baked in at **build time**, so redeploy the frontend if the
backend URL changes.

---

## 3. Supabase

Already provisioned (project `acaqzsepdvwhwdcvvbxs`). Schema lives in
`backend/db/migrations/` (`0001_history.sql`, `0002_tags_and_favorites.sql`) and
has been applied. Auth uses email/password; enable providers as desired in the
dashboard.

---

## 4. CI

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs backend `pytest`
and a frontend `npm run build` on every push/PR to `main`.

---

## Deploy order checklist
- [ ] Backend live on Render, `/api/health` green
- [ ] `CORS_ORIGINS` includes the frontend origin
- [ ] `VITE_API_BASE` set to the backend URL in Vercel
- [ ] Frontend deployed, generation + playback verified end-to-end
