# Features

Current functional scope of Khaata AI.

## 1. PDF upload

- Drag & drop or file picker; PDF only (type + size validated both client- and
  server-side: `application/pdf`, ≤ 10 MB).
- Upload sends a single `multipart/form-data` request to `/api/statements/upload`.
- Errors show inline on the page (wrong type, missing backend, parse failure).

## 2. Statement parsing (PhonePe + ICICI/bank)

Auto-detects the statement layout:

- **Bank format** (`SNo DD.MM.YYYY remark … amount balance`): used for ICICI and
  similar. Credit/debit derived from the balance delta between rows.
- **PhonePe format** (`Mon DD, YYYY` + `DEBIT/CREDIT ₹amount details`): type
  comes from the explicit line token.

Each transaction is normalized to:

```
{ sno, date (DD/MM/YYYY), merchant, category, type, amount, balance }
```

## 3. Hybrid AI categorization

Two passes, in order:

1. **Keyword rules** (fast, free, offline) — substring + bounded-regex matching
   against a large merchant dictionary.
2. **Gemini (free tier)** — the remaining unique "Other" merchants are sent in
   **one batched request** per upload; the AI's merchant→category map is applied
   back into the transactions when it succeeds.

Any AI failure (missing key, 429 quota, bad JSON, network) falls back silently to
keyword-only results — an upload never fails because of AI.

### Categories

```
Food | Grocery | Transport | Bills & Utilities | Entertainment | Shopping |
Health | Rent | Salary | Transfer | ATM | Other
```

### Recognized keyword coverage (examples)

| Category             | Examples                                              |
| -------------------- | ----------------------------------------------------- |
| Food                 | Zomato, Swiggy, Domino's, KFC, biryani, cafe, sweets, vada |
| Grocery              | D Mart, Big Basket, JioMart, Zepto, Blinkit, kirana, dairy |
| Transport            | Ola, Uber, Rapido, petrol, metro, IRCTC, toll, fastag, Maha Mumbai |
| Bills & Utilities    | Electricity, gas, broadband, recharge, Jio/Airtel, insurance, AWS |
| Entertainment        | Netflix, Prime, Hotstar, Spotify, BookMyShow, PVR, games |
| Shopping             | Myntra, Amazon, Flipkart, Zudio, Nykaa, foxtale, savana |
| Health               | Hospital, pharmacy, Apollo, doctor, netmeds, 1mg      |
| Rent / Salary / Transfer / ATM | rent, salary/payout, fund transfer/NEFT, ATM/cash |

Merchants not matched by anything (mainly UPI payments to individuals) stay
`Other` until Gemini classifies them.

## 4. Analysis dashboard (`/statements`)

After an upload, the page shows:

- **Stat cards** — Total Spent, Total Received, Net Balance, Ledger Score.
- **Category Breakdown** — table of categories with debit/credit totals and
  transaction counts, sorted by volume.
- **Transactions** — hidden by default to keep the page clean. Two ways to see it:
  - click a category row (shows only that category's transactions),
  - type in the search bar (filters by merchant / category / date).
  - Both filters combine; "Clear filters" resets everything.
  - Up to 50 rows rendered; amounts show +/− and INR formatting.
- **Clear statement** — resets the dashboard to start a new upload.

## 5. History (`/history`)

Every upload is persisted and listed, grouped **by upload date**:

- Day header with per-day totals (spent / received, txn count).
- Expandable cards per file: upload time, page/txn counts, spent/received/net,
  ledger score, category breakdown, and the first 50 transactions.
- Backed by `backend/data/history.json` (JSON file, atomic writes). Latest first.
- ⚠️ Ephemeral on Render (see Deployment docs).

## 6. Search

- Live client-side filtering as you type.
- Matches merchant name, category name, or date substring.
- Combines with the active category filter.

## 7. Debug logging

Tagged logs at every hop — `[env]`, `[req]`, `[pdf]`, `[upload]`, `[ai]`,
`[history]` — so production issues can be diagnosed from the Render Logs tab
or the browser Console. The Gemini key value is never printed.

## 8. Chat (`/chat`) — hybrid, works on the latest upload

The Chat page is no longer a static demo. It loads the **most recent upload**
and answers questions about it.

- Bot greeting + a pinned file card (current statement name + txn count).
- **Quick-reply buttons** — "Overview" + all 12 categories. Clicking one sends a
  query (no AI, instant).
- **Free text** — rule-based understanding: category names/aliases,
  `overview`, `total spent`, `received`, `net balance`, `ledger score`, `how
  many`, greetings.
- Category replies render a mini transactions table + spent/received totals.
- Summary replies render stat-pill cards (spent / received / net / score / txns).
- No statement yet → bot links to the Statements page, composer disabled.

Everything in chat is currently **rule-based (no Gemini)**. Unrecognized
questions return a fallback message. **Next step:** route unmatched questions to
Gemini for natural-language analysis (trends, "where did I overspend", savings
advice).

## Not implemented yet (Roadmap)

- Real AI chat over the uploaded data (replace the Chat demo).
- MongoDB/Postgres persistence (replace JSON file; survive Render redeploys).
- Auth (JWT + bcrypt) / multi-user.
- Monthly trends, top merchants, spending insights.
- Cross-upload search from History.