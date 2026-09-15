# Khaata AI — PDF Statement Extractor

Khaata AI ek Full-Stack app hai: **React (Vite) frontend** + **Express backend**.
Abhi ka working feature: **PhonePe/bank PDF statement upload karke uski raw text
extraction** (structured parsing, database, AI — aage ke steps).

## 📚 Documentation

| Doc | Contents |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Tech stack, folder layout, request & parsing pipeline, AI flow, storage |
| [docs/API.md](docs/API.md) | Every endpoint with request/response examples + error codes |
| [docs/SETUP.md](docs/SETUP.md) | Local dev setup, env vars, test PDFs, troubleshooting |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Render deploy, env vars, log lines to verify, caveats |
| [docs/FEATURES.md](docs/FEATURES.md) | What the app currently does + roadmap |

---

## Architecture — PDF data ka poora flow (step by step)

```
┌────────────────────────── FRONTEND (React) ──────────────────────────┐
│ Statements.jsx                                                       │
│ 1. File select/drag → FormData("statement", file)                    │
│ 2. fetch(API_BASE + "/api/statements/upload")                        │
│ 3. response JSON parse → result state → UI me dikhana               │
└───────────────┬──────────────────────────────────────────────────────┘
                │ HTTP POST (multipart/form-data)
                ▼
┌────────────────────────── BACKEND (Express) ─────────────────────────┐
│ app.js → routes/index.js → statement.routes.js                       │
│   → upload.single("statement")          [middleware: multer]         │
│   → uploadStatement(req, res)           [controller]                 │
│   → extractPdfText(req.file.buffer)     [service: pdf-parse]         │
└──────────────────────────────────────────────────────────────────────┘
```

### 1. Frontend — file select & FormData banana
File: `frontend/src/pages/Statements.jsx`

```js
const formData = new FormData();
formData.append("statement", file);   // field name "statement" = backend se match
```

- User drag & drop (ya browse) se PDF select karta hai
- `handleFile()` sirf `application/pdf` allow karta hai (line 33-34)

### 2. Frontend — POST request bhejna

```js
const res = await fetch(`${API_BASE}/api/statements/upload`, {
  method: "POST",
  body: formData,        // browser khud multipart/form-data set karta hai
});
```

- `API_BASE` = `import.meta.env.VITE_API_URL || ""`
  - **Local dev**: khali (`""`) → request relative `/api/...` jaati hai, Vite proxy
    (`vite.config.js` → `server.proxy['/api'] = 'http://localhost:5000'`) usse backend
    pe bhej deta hai
  - **Production (Render)**: `.env.production` me
    `VITE_API_URL=https://apna-khata-5rlb.onrender.com` → build ke time URL bundle me bake
    hota hai, siliye `/api` call seedha backend domain pe jata hai (proxy ka khaatam)

### 3. Frontend — response handle

```js
const text = await res.text();   // pehle text (taaki HTML aane pe bhi crash na ho)
data = JSON.parse(text);         // phir JSON parse
if (!res.ok) throw new Error(data.error || "Upload failed");
setResult(data);                 // state me store
```

- UI me line 139: `<pre className="raw-text">{result.rawText}</pre>`

### 4. Backend — entry gate
File: `backend/src/app.js`

```js
app.use(cors());              // React app (different domain) ko request allow
app.use(express.json());      // JSON body parse
app.use("/api", apiRouter);   // saare /api requests route system pe bhejo
```

### 5. Backend — URL matching & middleware chain
Files: `backend/src/routes/index.js` → `backend/src/routes/statement.routes.js`

```js
router.post("/upload", upload.single("statement"), uploadStatement);
```

- POST `/api/statements/upload` aaye → **pehle** `upload.single("statement")` chalta hai
  (multer middleware), phir controller

### 6. Backend — Multer middleware (file ko RAM me pakadta hai)
File: `backend/src/middlewares/upload.js`

```js
const storage = multer.memoryStorage();   // disk pe nahi likhta, RAM me rakhta hai
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);  // sirf PDF allow
    else cb(new Error("Only PDF files are allowed!"), false);
  },
});
```

- `upload.single("statement")` frontend ke `statement` field ko dhundhta hai
- File milne par usko parse karke `req.file.buffer` me daal deta hai (raw bytes)

### 7. Backend — Controller (business logic)
File: `backend/src/controllers/statement.controller.js`

```js
const { text, pages } = await extractPdfText(req.file.buffer);
res.json({ message, fileName, totalPages: pages, rawText: text });
```

- Multer ne file `req.file` me daal di → controller buffer ko service ko deta hai
- Service se jo return aata hai use JSON response banakar bhejta hai

### 8. Backend — Service (PDF se text nikalna)
File: `backend/src/services/pdfParser.js`

```js
const parser = new PDFParse({ data: buffer });   // pdf-parse v2
const result = await parser.getText();
return { text: result.text, pages: result.total };
```

- `pdf-parse` library PDF ke internal structure ko padhti hai
- PDF file me text objects (font, glyph, position ke saath) hote hain — library unhe
  decode karke **plain text** banati hai (jaise browser me "Select All → Copy")
- `result.text` = raw text, `result.total` = total pages
- **Koi structure/parsing nahi** — sirf raw dump. Ye kisi bhi text-based PDF ke liye kaam
  karta hai (PhonePe/bank dono); `image-only (scanned)` PDF pe empty/garbage aayega

### 9. Backend — Structured transaction parsing
File: `backend/src/services/statementParser.js`

Raw text ko structured transactions me convert karta hai:

```js
const transactions = parseTransactions(rawText);   // [{sno, date, merchant, category, type, amount, balance}]
const summary      = buildSummary(transactions);   // {totalSpent, totalReceived, net, categories[], ledgerScore}
```

**How it works (statementParser):**
- Har transaction ek block hota hai: `SNo DD.MM.YYYY remark...` lines, antim line
  amounts (`withdrawal balance` ya `deposit balance`)
- Regular expresssions se amounts nikalta hai (balance = last figure)
- **Credit/debit detection**: balance delta se — `balance[i] - balance[i-1]` agar amount
  se match karta hai, delta positive = credit (money in), negative = debit (money out)
- **Merchant**: UPI remarks me `UPI/NAME/...` pattern se naam nikalta hai
- **Categories**: keyword matching (Zomato/Swiggy → Food, Ola/Uber → Transport, etc.) —
  sirf merchant + normal words pe, taaki UPI reference hashes me random substrings
  (jaise "cab") match na karein
- **Ledger score**: savings-rate based formula (income - spend) / income

### 10. Controller response — ab structured data bhi
File: `backend/src/controllers/statement.controller.js`

```js
const transactions = parseTransactions(text);
const summary = buildSummary(transactions);

res.json({
  message, fileName, totalPages, rawText,
  transactions,   // [{sno, date, merchant, category, type, amount, balance}]
  summary,        // {totalSpent, totalReceived, net, categories, ledgerScore}
});
```

### 11. Hybrid AI Categorization (Gemini Free Tier)
File: `backend/src/services/aiCategorizer.js` + `backend/src/controllers/statement.controller.js`

**Why hybrid?** Keyword rules are instant/free but miss many merchants. Gemini fills gaps only for "Other" merchants — one batched call per upload, free tier (≈1,500 req/day, 15–20 RPM).

**Flow (in controller `uploadStatement`):**

```js
// 1. Parse transactions with keyword rules first
const transactions = parseTransactions(text);

// 2. Collect unique "Other" merchants
const unknownMerchants = [...new Set(
  transactions.filter(t => t.category === "Other").map(t => t.merchant)
)];

// 3. If any unknown, call Gemini ONCE with all of them
if (unknownMerchants.length > 0) {
  const map = await aiCategorize(unknownMerchants);  // returns {merchant: category} or null
  if (map) {
    for (const t of transactions) {
      if (t.category === "Other" && map[t.merchant] && map[t.merchant] !== "Other") {
        t.category = map[t.merchant];
      }
    }
  }
}

// 4. Build summary with AI-enhanced categories
const summary = buildSummary(transactions);
```

**`aiCategorize` service (`backend/src/services/aiCategorizer.js`):**

```js
async function aiCategorize(merchants) {
  if (!GEMINI_API_KEY || !merchants.length) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const prompt = [
      "You are a bank statement spending categorizer.",
      `Classify each merchant into exactly ONE of: ${CATEGORIES.join(", ")}.`,
      "Return ONLY a JSON object mapping each exact merchant name to a category. No extra text.",
      "Merchants:",
      ...merchants.map(m => `- ${m}`),
    ].join("\n");

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-goog-api-key": GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",  // forces valid JSON output
        },
      }),
    });

    if (!res.ok) return null;  // quota/key error → silent fallback

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = parseAiJson(text);  // strips fences, extracts JSON object
    if (!parsed) return null;

    // Validate categories against known list
    const map = {};
    for (const m of merchants) {
      const c = parsed[m];
      map[m] = CATEGORIES.includes(c) ? c : "Other";
    }
    return map;
  } catch {
    return null;  // never breaks upload
  }
}
```

**Key design choices:**
- `model: gemini-3.6-flash` (2.0/2.5 flash retired/404 in 2026)
- Key in header `X-goog-api-key` (not URL param)
- `responseMimeType: "application/json"` + `maxOutputTokens: 8192` prevents `MAX_TOKENS` truncation
- `parseAiJson()` handles fenced/plain/extra-text JSON robustly
- **Fail-safe**: any error (quota, network, bad key) → returns `null` → controller keeps keyword result
- 1 PDF = 1 AI request (batched); PhonePe 37 txns → ~15 "Other" → 1 call

**Quota notes (free tier, 2026):**
- ~15–20 RPM / 1,500 RPD (varies by model/account)
- Keys must be created in **AI Studio** (restricted); Google Cloud console keys may show "free limit 0"
- If exhausted → keyword-only still works; upgrade or wait for reset
- On Render, set `GEMINI_API_KEY` (and optional `GEMINI_MODEL`) in the **dashboard Environment** tab for the backend service — `backend/.env` is gitignored and not deployed

## Confusion-clearing: 2 alag "parse" hain — inhe mix mat karna

Do alag-alag "parse" kaam karte hain, dono bilkul alag cheez hain:

```
Parse #1  PDF parsing  →  backend me pdf-parse library
Parse #2  JSON parsing  →  frontend me JSON.parse()
```

**Parse #1 — PDF parsing (backend me, library):**
```
PDF file (binary) ──pdf-parse──> plain text
```
`pdfParser.js` me `pdf-parse` library PDF ke binary data ko padhti hai aur text nikaalti hai.

**Parse #2 — JSON parsing (frontend me):**
```
JSON string ("{...}") ──JSON.parse()──> JavaScript object
```
Ye sirf network se aayi hui response string ko readable object banata hai.
Iska PDF se koi lena-dena nahi hai.

### Data ka asli rasta (dhyan se dekho kahan kya hota hai)

```
PDF file (aap upload karte ho)
    │
    ▼
BACKEND:
pdf-parse library → PDF se text nikala
    │
    ▼
Backend text ko JSON me wrap kiya aur bheja:
{ "rawText": "1 18.04.2026 Fund transfer..." }
    │   (network pe string ke roop me jaata hai)
    ▼
FRONTEND receives:
"text aaya — abhi string hai"
    │
    ▼
JSON.parse(text) → object bana → data.rawText → UI me dikhaya
```

Matlab: **PDF ki asli parsing sirf backend ke `pdfParser.js` me hoti hai.**
Frontend ka `JSON.parse()` tu bas response object banata hai:

```js
// backend/src/services/pdfParser.js   ← PDF yaha parse hota hai
const parser = new PDFParse({ data: buffer });
const result = await parser.getText();

// frontend/src/pages/Statements.jsx   ← sirf response object banta hai
const text = await res.text();          // "{"rawText":"1 18.04.2026 Fund transfer..."}"
data = JSON.parse(text);                // { rawText: "1 18.04.2026 Fund transfer..." }
```

> Shortcut:
> - `pdf-parse` = PDF → text (backend, ek jagah)
> - `JSON.parse` = response string → object (frontend, ek jagah)
> - Inka PDF se koi relation nahi — frontend sirf JSON response handle karta hai.

---

### Ek line main summary

```
Browser → multer (PDF ko Buffer me) → pdf-parse (Buffer → plain text)
       → Express controller (JSON response) → React setResult → UI
```

---

## Repo structure

```
khata_ai/
├── backend/                  # Express API
│   └── src/
│       ├── server.js         # Entry point — server start
│       ├── app.js            # Express app: middleware + route mounting
│       ├── config/env.js     # .env loader (port, limits)
│       ├── routes/           # /api route aggregation
│       ├── controllers/      # Request/response logic
│       ├── middlewares/      # multer (upload) + error handler
│       └── services/         # pdf-parser (text extraction)
├── frontend/                 # React (Vite)
│   └── src/
│       ├── main.jsx          # React entry point
│       ├── App.jsx           # Layout: sidebar + routes
│       ├── App.css           # Design system
│       └── pages/
│           ├── Chat.jsx      # Chat UI (demo)
│           ├── Statements.jsx# PDF upload → raw text (working feature)
│           └── History.jsx   # Upload history (demo)
├── render.yaml               # Render deployment config
└── README.md
```

## Local setup

```bash
# Backend (terminal 1)
cd backend
npm install
npm run dev        # http://localhost:5000

# Frontend (terminal 2)
cd frontend
npm install
npm run dev        # http://localhost:5173
```

## API

### `POST /api/statements/upload`
multipart/form-data, field name = `statement`, PDF only, max 10MB.

**Response (200):**
```json
{
  "message": "PDF parsed successfully",
  "fileName": "phonepe_statement.pdf",
  "totalPages": 10,
  "rawText": "...raw extracted text...",
  "transactions": [
    { "sno": 1, "date": "18/04/2026", "merchant": "Fund transfer", "category": "Salary", "type": "credit", "amount": 21421, "balance": 21421 }
  ],
  "summary": {
    "totalSpent": 43162.74,
    "totalReceived": 54624,
    "net": 11461.26,
    "ledgerScore": 21,
    "transactionCount": 126,
    "categories": [
      { "name": "Food", "spent": 2324.9, "count": 15, "pct": 6 }
    ]
  }
}
```

### `GET /`
Health check → `{ "message": "Khaata AI backend is running!" }`

## Roadmap

- Structured transaction parsing (date/merchant/amount) from `rawText` ✅
- MongoDB models (statements, users) + Mongoose
- JWT auth + bcrypt
- Gemini API integration for the chatbot