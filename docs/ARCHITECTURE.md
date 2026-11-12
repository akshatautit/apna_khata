# Architecture

This document describes how Khaata AI is built and how data flows through the
system. It covers the tech stack, the folder layout, and the end-to-end request
flow — from a PDF upload to rendered insights.

## Tech stack

| Layer        | Technology                                   |
| ------------ | -------------------------------------------- |
| Frontend     | React 19 + Vite 8 + React Router 7           |
| Backend      | Node.js + Express 5 (CommonJS)               |
| File upload  | Multer (in-memory storage, 10 MB limit)      |
| PDF parsing  | `pdf-parse` v2                               |
| AI           | Google Gemini API (free tier), `axios`       |
| Storage      | JSON file (`backend/data/history.json`)      |
| Deployment   | Render (web + static services)               |

> **Why axios, not fetch?** Axios parses JSON automatically (`res.data` is already
> the object) and throws automatically on non-2xx responses — so API calls need
> less manual `JSON.parse()` / `res.ok` handling. Chosen mainly for readability:
> the same call is a few lines instead of fetch's ceremony.

## Folder layout

```
khata_ai/
├── backend/                          # Express API
│   └── src/
│       ├── server.js                 # HTTP entry point + [env] startup logs
│       ├── app.js                    # Express app: middleware + route mounting
│       ├── config/env.js             # dotenv loader (port, limits)
│       ├── routes/
│       │   ├── index.js              # Aggregates /api sub-routers
│       │   ├── statement.routes.js   # /upload + /history routes
│       │   └── chat.routes.js        # /chat/message (bot, latest upload)
│       ├── controllers/
│       │   ├── statement.controller.js   # Upload + history handlers
│       │   └── chat.controller.js    # Rule-based chat answers (no AI yet)
│       ├── middlewares/
│       │   ├── upload.js             # Multer (PDF only, in-memory)
│       │   └── errorHandler.js       # Central error → HTTP response
│       ├── services/
│       │   ├── pdfParser.js          # PDF buffer → raw text
│       │   ├── statementParser.js    # Raw text → transactions + summary
│       │   ├── aiCategorizer.js      # Gemini call for "Other" merchants
│       │   └── historyStore.js       # JSON-file persistence
│       └── data/                     # history.json (gitignored, created at runtime)
├── frontend/                         # React (Vite)
│   └── src/
│       ├── main.jsx                  # React entry point
│       ├── App.jsx                   # Sidebar layout + routes
│       ├── App.css                   # Design system / all styles
│       ├── pages/
│       │   ├── Statements.jsx        # PDF upload + analysis dashboard
│       │   ├── History.jsx           # Date-wise upload history
│       │   └── Chat.jsx              # Static demo chat (not wired to Gemini)
├── render.yaml                       # Render blueprint (backend + frontend)
├── docs/                             # This documentation
└── README.md
```

## Request flow (PDF upload)

```
Browser (Statements.jsx)
  drag & drop or click → file selected
  FormData.append("statement", file)
        │  POST {API_BASE}/api/statements/upload   (multipart/form-data)
        ▼
Express app.js
  cors() → express.json() → [req] logger → /api router

statement.routes.js
  router.post("/upload", upload.single("statement"), uploadStatement)
        │
        ▼
middlewares/upload.js (Multer)
  validates: mimetype === "application/pdf", size ≤ 10 MB
  stores bytes in memory → req.file.buffer
        │
        ▼
controllers/statement.controller.js
  1. extractPdfText(buffer)                 → raw text + page count
  2. parseTransactions(text)                → keyword-categorized transactions
  3. collect unique "Other" merchants
  4. aiCategorize(merchants)                → {merchant: category} or null
  5. apply AI results to Other transactions (if any)
  6. buildSummary(transactions) → spent/received/net/categories/ledgerScore
  7. addEntry({ ... })                      → history.json
  8. res.json({ message, fileName, totalPages, rawText, transactions, summary })
```

JSON is sent to the client, which renders:

1. Result bar (file name, page/txn counts, **Clear statement**)
2. Stat cards (Total Spent, Total Received, Net Balance, Ledger Score)
3. Category Breakdown table (default view)
4. Search bar
5. Transactions table — **hidden until a category is clicked or a search is typed**

## Parsing pipeline

The PDF text is parsed by one of two strategies, auto-detected in
`statementParser.js`:

| Format | Detection                              | Parser                     |
| ------ | -------------------------------------- | -------------------------- |
| Bank   | Line matches `SNo DD.MM.YYYY remark… amount balance` | `parseBankTransactions` |
| PhonePe | `Mon DD, YYYY` headers or "Transaction Statement for" | `parsePhonePeTransactions` |

### Credit / debit detection (bank format)

`classifyType` compares the transaction amount against the account balance
delta between consecutive rows:

- `delta = balance[i] - balance[i-1]`
- `delta > 0` and matches amount → **credit**
- `delta < 0` and matches amount → **debit**
- If no previous balance, keyword heuristics fall back (credit / debit / default debit)

### Merchant extraction

Patterns tried in order (`extractMerchant`):

1. `UPI/<name>/…` — UPI payment recipient
2. `Paid to / Payment to / Received from / Sent to <name>`
3. `Mobile recharged <num> <name>`
4. First line of the remark (truncated to 40 chars)

### Categorization

1. Keyword rules (`CATEGORY_RULES`) — substring match on merchant + remark words
2. Word regex (`CATEGORY_WORD_RE`) — bounded `\b…\b` matches to avoid matching
   random substrings in UPI reference hashes
3. Everything unmatched → `Other`

Unknown-`Other` merchants are sent to Gemini in `aiCategorizer.js` for a second
pass (see below).

## Hybrid AI categorization

**Goal:** make uploads fast and free, but still classify merchants the keyword
rules cannot recognize (mostly UPI payments to individuals / local shops).

Flow in the controller:

```js
const unknownMerchants = [
  ...new Set(
    transactions.filter(t => t.category === "Other").map(t => t.merchant)
  ),
];

if (unknownMerchants.length > 0) {
  const map = await aiCategorize(unknownMerchants);   // null on any failure
  if (map) {
    for (const t of transactions) {
      if (t.category === "Other" && map[t.merchant] && map[t.merchant] !== "Other") {
        t.category = map[t.merchant];
      }
    }
  }
}
```

`aiCategorize` (`backend/src/services/aiCategorizer.js`):

- Sends **one batched request per upload** (all unique "Other" merchants at once).
- Calls `POST https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent`
- Auth via `X-goog-api-key` header (not URL param).
- `responseMimeType: "application/json"`, `temperature: 0.1`,
  `maxOutputTokens: 8192` → structured JSON, no truncation.
- Validates every returned category against the known category list.
- **Fail-safe:** any error (missing key, HTTP 429 quota, network, bad JSON)
  returns `null` → the controller keeps the keyword-only result. An upload
  never breaks because the AI failed.

```
1 PDF = 1 batched AI request  (PhonePe 37 txns → ~15 unknown → 1 call)
```

## Storage (history)

`historyStore.js` persists every upload to a single JSON file:

- Location: `backend/data/history.json`
- Writes are **atomic**: write to `history.json.tmp` then `rename` over the file.
- Reads are **sorted newest-first** on `GET /api/statements/history`.
- `backend/data/` is gitignored.
- ⚠️ Render works on an **ephemeral filesystem** — redeploys/restarts wipe it.

## Ledger Score

A 0–100 "savings health" score computed in `buildSummary`:

```js
savingsRate     = (totalReceived - totalSpent) / totalReceived
ledgerScore     = clamp(0, 100, round(savingsRate * 100))
```

- High score → earning more than spending (surplus).
- Low score → spending more than earning (deficit).
- If there is no income (`totalReceived === 0`) but there are debits, a fallback
  score based on the average transaction size is used (range 30–70).
- Default `50` when there is no data.

## Debug logging

Every stage logs a tagged line so a live deploy can be diagnosed from the
Render "Logs" tab (or the terminal in local dev). The Gemini key value is
**never logged** — only its presence and length:

| Tag         | File            | Example                                            |
| ----------- | --------------- | -------------------------------------------------- |
| `[env]`     | server.js       | `GEMINI_API_KEY=SET (39 chars)` / `MISSING`        |
| `[req]`     | app.js          | `POST /api/statements/upload`                      |
| `[pdf]`     | pdfParser.js    | `extracted 18234 chars \| 8 page(s)`                |
| `[upload]`  | controller      | `AI map applied to 5 transaction(s)`               |
| `[ai]`      | aiCategorizer   | `HTTP 429 → falling back to keywords`              |
| `[history]` | historyStore    | `added entry … \| total entries: 5`                |
| `[upload]`  | frontend        | console message on success/failure (browser DevTools) |