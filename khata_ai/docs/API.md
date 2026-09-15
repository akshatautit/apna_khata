# API Reference

Base URLs:

- Local dev: `http://localhost:5000`
- Render backend: `https://apna-khata-5rlb.onrender.com`

All routes are mounted under `/api` except the health check. Responses are
JSON. Errors follow `{ "error": "<message>" }`.

## `GET /` — Health check

```json
{ "message": "Khaata AI backend is running!" }
```

## `POST /api/statements/upload` — Upload & parse a PDF

`multipart/form-data`, field name **must be `statement`**.

| Constraint       | Value                         |
| ---------------- | ----------------------------- |
| File field       | `statement`                   |
| Allowed type     | `application/pdf`             |
| Max size         | 10 MB                         |

**Request example (curl):**

```bash
curl -F "statement=@statement.pdf" http://localhost:5000/api/statements/upload
```

**Response `200 OK`:**

```json
{
  "message": "PDF parsed successfully",
  "fileName": "phonepe_statement.pdf",
  "totalPages": 8,
  "rawText": "...raw extracted text...",
  "transactions": [
    {
      "sno": 1,
      "date": "18/04/2026",
      "merchant": "Zomato",
      "category": "Food",
      "type": "debit",
      "amount": 345.5,
      "balance": 21421.55
    }
  ],
  "summary": {
    "totalSpent": 43162.74,
    "totalReceived": 54624,
    "net": 11461.26,
    "ledgerScore": 21,
    "transactionCount": 126,
    "categories": [
      { "name": "Food", "spent": 2324.9, "received": 0, "count": 15 }
    ]
  }
}
```

Notes:

- `date` is normalized to `DD/MM/YYYY`.
- `type` is `"credit"` (money in) or `"debit"` (money out).
- `balance` may be `null` in PhonePe statements (balance is not transcribed).
- `category` reflects the final hybrid result (keywords + AI, when it succeeds).
- Categories are sorted by total volume (spent + received) descending.
- The upload is **also saved to history** automatically.

**Errors:**

| Status | Cause                                        |
| ------ | -------------------------------------------- |
| 400    | No file / wrong field name / non-PDF / >10 MB |
| 500    | PDF extraction or parsing failure            |

```json
{ "error": "Only PDF files are allowed!" }
{ "error": "No PDF file uploaded" }
{ "error": "Upload error: File too large" }
```

## `GET /api/statements/history` — List upload history

Returns all uploaded statements, **newest first**.

**Response `200 OK`:**

```json
{
  "entries": [
    {
      "id": "1792141210000-ab12cd",
      "fileName": "phonepe_statement.pdf",
      "uploadedAt": "2026-09-13T10:15:00.000Z",
      "uploadedDate": "2026-09-13",
      "totalPages": 8,
      "transactionCount": 126,
      "summary": { "totalSpent": 43162.74, "totalReceived": 54624, "net": 11461.26, "ledgerScore": 21, "transactionCount": 126, "categories": [] },
      "transactions": [ ]
    }
  ]
}
```

An empty deployment returns `{ "entries": [] }`.

⚠️ History is stored in a JSON file on the server disk. On Render this is
**ephemeral** — cleared on restart/redeploy.

## `POST /api/chat/message` — Ask the chat bot (latest upload)

`application/json` body: `{ "message": "Food" }`

The bot answers against the **most recent upload** in history. Simple queries
are answered with rules (no AI); anything unrecognized returns a fallback
telling the user what it can answer. (AI-powered analysis is planned next.)

**Response types:**

| `type`       | Reply shape                                                     |
| ------------ | --------------------------------------------------------------- |
| `category`   | Transactions for one category (table data) + spent/received/count |
| `summary`    | The statement `summary` + a short `message`                     |
| `empty`      | No statement uploaded yet (with guidance)                       |
| `fallback`   | Could not understand — lists what it supports                   |
| `error`      | Empty/malformed input                                           |

**Example (category):**

```json
{
  "type": "category",
  "category": "Food",
  "title": "Food — 28 transactions",
  "message": "Here are your food transactions from \"statement.pdf\".",
  "spent": 4421.9,
  "received": 0,
  "count": 28,
  "transactions": [ { "sno": 9, "date": "19/04/2026", "merchant": "S V Foods", "category": "Food", "type": "debit", "amount": 125, "balance": 19997 } ]
}
```

**Example (summary):**

```json
{
  "type": "summary",
  "focus": "spent",
  "summary": { "totalSpent": 43162.74, "totalReceived": 54624, "net": 11461.26, "ledgerScore": 21, "transactionCount": 126, "categories": [] },
  "message": "You spent ₹43,162.74 in total."
}
```

### Recognized queries (rule-based, no AI)

- Category names + aliases: `Food`, `transport`, `bills`, `grocery`, `score`,
  `rent`, `sent`, `cash`, `cab`, `petrol`, `recharge`, `movie`, `hospital`, …
- `overview` / `summary` / `total` / `analysis` → full overview
- `total spent` / `kharcha` / `expense` → spent
- `received` / `income` / `kamai` → received
- `net` / `balance` / `savings` → net balance
- `ledger score` → score
- `how many` / `kitni` / `transactions` → transaction count
- `hi` / `hello` / `namaste` → greeting

Anything else → `fallback` (until the AI analysis step is wired in).

## Errors

Central error handler in `backend/src/middlewares/errorHandler.js`:

| Condition                            | Status | Response                 |
| ------------------------------------ | ------ | ------------------------ |
| Multer error (upload)                | 400    | `Upload error: <message>` |
| Non-PDF file                         | 400    | `Only PDF files are allowed!` |
| Anything else                        | 500    | `{ "error": "<message>" }` |
| Unknown route                        | 404    | `{ "error": "Route not found" }` |