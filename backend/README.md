# Khaata AI — Backend (Express)

Yeh Khaata AI ka API server hai. Browser yahi call karta hai.

Abhi yeh app yeh sab karta hai:

- email aur password se register / login (bcrypt + JWT)
- PDF statement upload, text nikalna, transactions parse karna
- category lagana (keywords, phir Gemini)
- summary aur ledger score MongoDB mein save karna
- us user ki history dena
- latest statement pe chat: fixed sawal seedhe numbers se, baaki sawal Gemini se

Database na ho to bhi server start ho jaata hai, lekin history khaali list deti hai.

## Tech stack

- **Node.js** + **Express** — API server
- **Mongoose** + **MongoDB Atlas** — users aur statements save karna
- **jsonwebtoken** — login token (JWT)
- **bcryptjs** — password ka hash. Asli password save nahi hota
- **Multer** — PDF upload, file memory mein rehti hai, disk pe nahi
- **pdf-parse** — PDF se raw text
- **axios** — Gemini API call
- **cors** — React app (alag port) is API ko call kar sake
- **dotenv** — `.env` se variables load karna
- **nodemon** — development mein file badle to server restart

## .env mein kya chahiye

`backend/.env` mein yeh keys hon:

- `PORT` — default `5000`
- `MONGODB_URI` — Atlas connection string. Database ka naam URL mein `khaata` hai
- `JWT_SECRET` — token sign karne ki secret. Missing ho to code ek dev default use karta hai
- `JWT_EXPIRES_IN` — default `7d`
- `GEMINI_API_KEY` — shop category aur chat answers ke liye
- `GEMINI_MODEL` — default `gemini-3.6-flash`

Is file mein password aur API key hoti hai. Use git pe commit mat karna.

## Project structure

```
backend/
├── src/
│   ├── server.js                         # server start, Mongo connect
│   ├── app.js                            # Express: cors, json, /api, health, errors
│   ├── db.js                             # mongoose.connect
│   ├── config/
│   │   └── env.js                        # .env load, port, mongo, jwt
│   ├── models/
│   │   ├── User.js                       # name, email, passwordHash
│   │   └── Statement.js                  # upload, summary, transactions
│   ├── routes/
│   │   ├── index.js                      # /api ke neeche saare routes
│   │   ├── auth.routes.js                # register, login, me
│   │   ├── statement.routes.js           # upload, history
│   │   └── chat.routes.js                # message
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── statement.controller.js
│   │   └── chat.controller.js
│   ├── middlewares/
│   │   ├── auth.js                       # Bearer token check, JWT issue
│   │   ├── upload.js                     # sirf PDF, max 10 MB, memory
│   │   └── errorHandler.js
│   └── services/
│       ├── pdfParser.js                  # PDF se text
│       ├── statementParser.js            # bank + PhonePe lines, summary
│       ├── aiCategorizer.js              # unknown shops → Gemini category
│       ├── aiAnalyst.js                  # normal chat sawal → Gemini
│       └── historyStore.js               # statements save / list
├── scripts/
│   └── migrateStatements.js              # purana test.statements → khaata.statements
├── .env
└── package.json
```

Database ka lamba explanation `docs/DATABASE.md` mein hai, Hinglish mein.

### Request ka raasta

```
Browser
  → route
  → auth middleware (login wali APIs pe)
  → upload middleware (sirf PDF upload pe)
  → controller
  → service (parser / Gemini / Mongo)
```

## Chalana

```bash
cd backend
npm install
npm run dev        # development, nodemon
npm start          # production, bina auto-restart
```

Server: `http://localhost:5000`.

Frontend alag folder se chalta hai:

```bash
cd frontend
npm install
npm run dev
```

Frontend aksar `http://localhost:5173` pe hota hai. `vite.config.js` `/api` ko `http://localhost:5000` pe proxy karta hai, isliye `VITE_API_URL` khali reh sakta hai.

Atlas pe is computer ka IP **Network Access** mein Active hona chahiye. IP whitelist mein na ho to server yeh error deta hai ki cluster ke servers se connect nahi ho paya. History us waqt khaali rahegi.

## API

Login ke baad frontend har call pe yeh header bhejta hai:

```
Authorization: Bearer <token>
```

### `GET /`

Health check. Login ki zaroorat nahi.

```json
{ "message": "Khaata AI backend is running!" }
```

### `POST /api/auth/register`

Body JSON: `name` (optional), `email`, `password` (kam se kam 6 characters).

Kaam: email lowercase, password hash, **users** mein naya document, JWT return.

- `201` — account ban gaya, `{ token, expiresIn, user }`
- `400` — email/password missing, ya password chhota
- `409` — email already registered

### `POST /api/auth/login`

Body JSON: `email`, `password`.

- `200` — `{ token, expiresIn, user }`
- `401` — `No account with this email. Register first.` ya `Wrong password for this email.`

### `GET /api/auth/me`

Login zaroori. Token ke user ko database se nikal kar name/email deta hai. `passwordHash` response mein nahi aata.

### `POST /api/statements/upload`

Login zaroori. `multipart/form-data`, field name `statement`. Sirf PDF, max 10 MB.

Kaam:

1. PDF se text.
2. Bank layout (`SNo DD.MM.YYYY` + amount + balance) ya PhonePe layout (`Mon DD, YYYY` + `DEBIT/CREDIT ₹amount`) detect karke transactions.
3. Keyword se category. Jo `Other` bache, un merchants ko Gemini.
4. Summary: spent, received, net, ledger score, categories.
5. **statements** mein save, `user` = login user ki id.

`200` pe `fileName`, `totalPages`, `rawText`, `transactions`, `summary` aata hai.

| Status | Kab |
| --- | --- |
| `400` | file nahi, PDF nahi, ya size zyada |
| `401` | token nahi ya token galat/expire |
| `500` | PDF parse nahi ho payi |

Invoice jaisi file (bank/PhonePe layout nahi) save ho jaati hai, lekin `transactionCount` 0 aur `transactions` khaali reh sakte hain.

### `GET /api/statements/history`

Login zaroori. Is user ki statements, nayi pehle. Mongo connected na ho to `{ "entries": [] }`.

### `POST /api/chat/message`

Login zaroori. Body: `{ "message": "..." }`.

Sirf is user ki **latest** statement use hoti hai.

- `Overview` — Spent, Received, Net, Score, Txns ki strip.
- Category ka naam, `total spent`, `kharcha`, `net`, `ledger score`, `how many` — seedha number wala jawab, bina us strip ke.
- Koi aur sawal — Gemini (`aiAnalyst.js`). Gemini fail ho to fixed "I didn't quite get that" message.
- Koi statement hi nahi — pehle Statements page pe PDF upload karo.

Category chips frontend pe sirf un categories ke bante hain jinme is statement ki rows hain.

## File rules

- Upload field ka naam `statement` hona chahiye
- Sirf `.pdf` / `application/pdf`
- Max size: 10 MB
