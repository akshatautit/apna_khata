# Local Setup

Prerequisites:

- Node.js 20+ (npm comes with it)
- Internet access when AI categorization should work

## 1. Install dependencies

```bash
cd khata_ai
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

## 2. Backend environment

The backend reads `backend/.env` (gitignored — you create it yourself).

```bash
cd backend
nano .env              # create it (there is no committed example file)
```

Minimal `.env`:

```
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-3.6-flash
PORT=5000
```

| Variable         | Required | Default              | Notes                                   |
| ---------------- | -------- | -------------------- | --------------------------------------- |
| `GEMINI_API_KEY` | No       | —                    | Skipping it disables AI (keyword-only). Also falls back to `GOOGLE_API_KEY`. |
| `GEMINI_MODEL`   | No       | `gemini-3.6-flash`   | Model name used for `generateContent`.  |
| `PORT`           | No       | `5000`               | Injected by Render on deploy.           |

Get a free key at <https://aistudio.google.com/apikey>.

## 3. Run the backend

```bash
cd backend
npm run dev        # nodemon, restarts on change — http://localhost:5000
npm start          # plain node, no auto-restart
```

Verify it is up:

```bash
curl http://localhost:5000/
# { "message": "Khaata AI backend is running!" }
```

Watch the startup logs — you should see `[env] GEMINI_API_KEY=SET (39 chars)`
(or `MISSING` if you skipped the key).

## 4. Run the frontend

```bash
cd frontend
npm run dev        # Vite dev server — http://localhost:5173
```

Vite proxies `/api` → `http://localhost:5000` (see `frontend/vite.config.js`),
so no extra configuration is needed in dev.

For a production-style build (optional in local dev) the API base is baked in at
build time from `frontend/.env.production` (`VITE_API_URL`). Leave it unset for
local-only use.

## 5. Upload a test PDF

Open <http://localhost:5173>, use drag & drop or "Choose file" on the
Statements page, then click **Upload & Extract**.

Valid test files:

- PhonePe statement: `/home/hp/Downloads/PhonePe_Statement_Aug2026_Sep2026 (1).pdf`
- ICICI bank statement: `/home/hp/Downloads/OpTransactionHistory24-06-2026.pdf-18-19-54.pdf`

or via curl:

```bash
curl -F "statement=@/path/to/statement.pdf" \
     http://localhost:5000/api/statements/upload | tee /tmp/upload.json
```

## Useful commands

| Command                       | Where      | Purpose                              |
| ----------------------------- | ---------- | ------------------------------------ |
| `npm run build`               | frontend   | Production bundle to `dist/`         |
| `npm run lint`                | frontend   | oxlint static checks                 |
| `node --check <file>`         | backend    | Syntax-check a backend file          |
| `curl http://localhost:5000/` | —          | Backend health check                 |

## Debugging locally

- Backend logs print to the terminal running the dev server (tags `[env]`, `[req]`, `[pdf]`, `[upload]`, `[ai]`, `[history]`).
- Browser logs (tagged `[upload]`) appear in **DevTools → Console** (F12).
- If the AI key is missing or quota-exhausted you will see
  `[ai] HTTP 429 → falling back to keywords` — the upload **still succeeds**
  with keyword-only categories.