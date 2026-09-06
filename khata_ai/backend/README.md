# Khaata AI — Backend (Express)

Express API for Khaata AI. Currently handles **PDF statement upload + raw text
extraction** (Step 1 of the project). No database, no auth, and no AI yet.

## Tech stack

- **Node.js** + **Express** — API server
- **Multer** — file upload handling (PDF stored in memory)
- **pdf-parse** — extracts raw text from the uploaded PDF
- **cors** — allows the React app (different port) to call this API
- **dotenv** — loads env variables from `.env`
- **nodemon** — auto-restarts the server during development

## Project structure

```
backend/
├── src/
│   ├── server.js                      # Entry point — starts the server
│   ├── app.js                         # Express app: middleware + route mounting
│   ├── config/
│   │   └── env.js                     # Loads .env, exports config (port, limits)
│   ├── routes/
│   │   ├── index.js                   # Aggregates all feature routes under /api
│   │   └── statement.routes.js        # Routes for the Statements feature
│   ├── controllers/
│   │   └── statement.controller.js    # Handles the request/response logic
│   ├── middlewares/
│   │   ├── upload.js                  # Multer config (PDF-only, 10MB max, memory)
│   │   └── errorHandler.js            # Central error → JSON response
│   └── services/
│       └── pdfParser.js               # pdf-parse wrapper (raw text extraction)
├── .env                               # Environment variables
└── package.json
```

### How the layers talk to each other

```
Browser/React  →  routes  →  middlewares  →  controller  →  service  →  pdf-parse
     (POST /api/statements/upload)                 (upload.single)   (PDFParse.getText)
```

Each layer has one job, so when we add MongoDB, JWT auth, or Gemini later, we just
slip a new service (or controller) into the same pattern.

## Setup & run

```bash
# 1. Install dependencies
npm install

# 2. Create .env (or edit the existing one)
# PORT=5000

# 3. Start the server
npm run dev        # development (auto-restart)
npm start          # production
```

Server runs on `http://localhost:5000`.

## API

### `GET /`

Health check.

**Response:**
```json
{ "message": "Khaata AI backend is running!" }
```

### `POST /api/statements/upload`

Accepts a PDF file (multipart/form-data, field name `statement`) and returns
its raw extracted text.

**Request:**
```
curl -X POST -F "statement=@phonepe_statement.pdf" http://localhost:5000/api/statements/upload
```

**Response (200):**
```json
{
  "message": "PDF parsed successfully",
  "fileName": "phonepe_statement.pdf",
  "totalPages": 1,
  "rawText": "...raw text extracted from the PDF..."
}
```

**Errors:**
| Status | When |
| ------ | ---- |
| `400` | No file uploaded / not a PDF / file too large |
| `404` | Route does not exist |
| `500` | PDF could not be parsed |

### File rules

- Field name must be `statement`
- `.pdf` only
- Max size: 10 MB

## Roadmap (later steps)

- MongoDB models (statements, users) + Mongoose
- JWT auth + bcrypt password hashing
- Gemini API integration for the chatbot
- Structured transaction parsing (dates, amounts, merchants) from `rawText`