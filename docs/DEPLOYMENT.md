# Deployment (Render)

Two Render services are defined in `render.yaml` (a blueprint), or can be
created manually in the dashboard.

| Service            | Type   | Root dir          | Start                       |
| ------------------ | ------ | ----------------- | --------------------------- |
| `apna-khata-backend`  | Web (Node) | `khata_ai/backend` | `npm start` on `:5000`    |
| `apna-khata-frontend` | Static     | `khata_ai/frontend` | build → publish `dist`   |

Live URLs:

- Backend: <https://apna-khata-5rlb.onrender.com>
- Frontend: <https://apna-khata-frontend.onrender.com>

## Frontend → backend wiring

The frontend needs to know the backend URL at **build time**. Two places define it:

1. `frontend/.env.production` (tracked in git):
   ```
   VITE_API_URL=https://apna-khata-5rlb.onrender.com
   ```
2. `render.yaml` frontend `envVars` (same value). Prefer `render.yaml` because the
   frontend service rebuilds with those vars regardless of local files.

In local dev, `VITE_API_URL` is unset → the Vite proxy makes `/api` work.

## Backend environment variables (important!)

These must be set on the **backend service**:

| Variable         | Required | Default              | Notes |
| ---------------- | -------- | -------------------- | ----- |
| `GEMINI_API_KEY` | No*      | —                    | *Without it, AI categorization is skipped (keyword-only). Name is **case-sensitive** — must be `GEMINI_API_KEY`, not `gemini_api_key`. Also accepts `GOOGLE_API_KEY`. |
| `GEMINI_MODEL`   | No       | `gemini-3.6-flash`   | Optional override.             |
| `PORT`           | No       | `5000` (in render.yaml) | Render can also inject its own. |

### Where to set it in the Render dashboard

1. Open the **project** → click the **`apna-khata-backend` service**.
2. In the **left pane** of the service page, click **Environment**.
   (This is *inside* the service page — not the project-level Environment tab.)
3. **Add Environment Variable** → key `GEMINI_API_KEY`, value = your full key.
   Do the same for `GEMINI_MODEL` if you want a non-default model.
4. **Save & Deploy**.

> Env-groups can be used too, but the key **name** must match exactly
> (`GEMINI_API_KEY`). A lowercase `gemini_api_key` will be read as "MISSING".

## Recognized startup log lines

After deploy, open the backend **Logs** tab and confirm:

```
[env] NODE_ENV=production | RENDER=true
[env] GEMINI_API_KEY=SET (39 chars)   ← good;  "MISSING" → check key name/casing
[env] GEMINI_MODEL=gemini-3.6-flash (default)
Server running on http://localhost:5000
```

Then upload a PDF from the live frontend and watch for:

```
[req] POST /api/statements/upload
[upload] file: <name> (<size> bytes)
[pdf] extracted <n> chars | <p> page(s)
[upload] Other merchants after keywords: <n>
[ai] key=present model=gemini-3.6-flash
[ai] parsed <n> merchant→category entries        ← or "HTTP 429 → falling back to keywords"
[upload] AI map applied to <n> transaction(s)
[history] added entry <id> | total entries: <n>
```

In the browser, open **DevTools → Console** (F12) for the frontend `[upload]`
success/failure message.

## Known deployment caveats

1. **Ephemeral filesystem.** History lives in `backend/data/history.json` on the
   server disk. Any restart/redeploy on Render **clears upload history**. This is
   an accepted trade-off until a real database (e.g., MongoDB/Postgres) is added.
2. **Gemini free-tier quota.** ~15–20 requests/min, ~1,500/day (2026). The key must
   be created in **AI Studio** (Google Cloud Console keys may report free limit 0).
   On quota exhaustion the app degrades gracefully to keyword-only
   categorization (`[ai] HTTP 429 → falling back to keywords`).
3. **Git-ignored secrets.** `backend/.env` is gitignored and never deployed;
   Render's own Environment vars are the source of truth in production.
4. **Auto-deploys.** Every push to `main` triggers a rebuild from `render.yaml`. A
   failed build blocks the deploy — check the service **Events** tab first.

## Redeploying after code changes

1. Commit and push to `main`:
   ```bash
   git add -A
   git commit -m "feat: describe change"
   git push origin main
   ```
2. Render auto-deploys both services (watch each service's Events tab).
3. Re-verify with the log lines above if the change touches parsing/AI.