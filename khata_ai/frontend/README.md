# Khaata AI — Frontend (React)

React front-end for Khaata AI, styled after the "ledger paper" design mockup.
Built with **Vite** (fast dev server + build tooling) and **React Router** for
navigation between the three sections: **Chat**, **Statements**, **History**.

## Tech stack

- **React** (functional components + hooks)
- **Vite** — bundler / dev server (port 5173)
- **React Router** — sidebar navigation (`/chat`, `/statements`, `/history`)
- **CSS** — hand-written stylesheet (`App.css`) using the mockup's color system

## Design system

| Token | Color | Used for |
| ----- | ----- | -------- |
| `--ink` | `#16231C` | Sidebar, dark buttons |
| `--paper` | `#EEEAE0` | Page background |
| `--paper-2` | `#E4DECF` | Tracks/bars, tags |
| `--ledger` | `#2F6F52` | Primary green (active nav, user messages) |
| `--brass` | `#B8863B` | File message, secondary bars |
| `--debit` | `#A2453D` | Money going out |
| `--white` | `#FBFAF6` | Cards, inputs |

Fonts: **Fraunces** (serif headings), **IBM Plex Sans** (body),
**IBM Plex Mono** (amounts) — loaded from Google Fonts in `index.html`.

## Project structure

```
frontend/
├── index.html                  # App shell + Google Fonts
├── vite.config.js              # Dev server + /api proxy → backend :5000
├── src/
│   ├── main.jsx                # React entry point
│   ├── App.jsx                 # Layout: sidebar + routes
│   ├── App.css                 # Full design system
│   ├── pages/
│   │   ├── Chat.jsx            # Chat UI (messages + composer)
│   │   ├── Statements.jsx      # PDF upload → raw text + analytics preview
│   │   └── History.jsx         # Past uploaded statements list
```

## Setup & run

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Open `http://localhost:5173`.

> The backend must also be running (port 5000). Vite proxies every `/api`
> request to it automatically — see `server.proxy` in `vite.config.js`.

## Pages

### Chat (`/chat`)
Conversation UI with bot/user message bubbles and a message composer
(📎 attach + ➤ send). Chat still uses seeded demo messages — Gemini wiring
comes in a later step.

### Statements (`/statements`) — the working feature
- Drag & drop (or browse) a PhonePe PDF → uploads to
  `POST /api/statements/upload`
- Returns and displays the **raw extracted text** in the "Extracted Raw Text" panel
- Below that are demo analytics (Total Spent / Total Received / Ledger Score,
  Category Breakdown, Transactions table) — these are **placeholder numbers**
  from the design mockup and will be fed from real parsed data later.
- "Ask AI →" navigates to the Chat page.

### History (`/history`)
List of previously uploaded statements. Data is demo rows for now — will be
loaded from MongoDB in a later step.

## Roadmap (later steps)

- JWT login/signup screens
- Real transaction parsing → live stats, charts, ledger score
- Gemini-powered Q&A on spending
- Statement records stored in MongoDB and listed in History