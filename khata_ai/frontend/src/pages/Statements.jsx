import { useState, useRef } from "react";
import { Link } from "react-router-dom";

const DEMO_CATEGORIES = [
  { label: "Food", value: "₹4,320", width: 70, brass: false },
  { label: "Rent", value: "₹9,000", width: 100, brass: false },
  { label: "Shopping", value: "₹2,890", width: 40, brass: true },
  { label: "Travel", value: "₹1,240", width: 20, brass: true },
  { label: "Bills", value: "₹1,200", width: 14, brass: false },
];

const DEMO_TXN = [
  { date: "28 Aug", merchant: "Zomato", category: "Food", amount: "−₹420", type: "debit" },
  { date: "25 Aug", merchant: "Netflix", category: "Subscription", amount: "−₹199", type: "debit" },
  { date: "20 Aug", merchant: "Salary Credit", category: "Income", amount: "+₹32,000", type: "credit" },
  { date: "14 Aug", merchant: "Myntra", category: "Shopping", amount: "−₹1,850", type: "debit" },
  { date: "1 Aug", merchant: "House Rent", category: "Rent", amount: "−₹9,000", type: "debit" },
];

export default function Statements() {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  function handleFile(selected) {
    const f = selected?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("Sirf PDF file select karo.");
      setFile(null);
      return;
    }
    setError("");
    setResult(null);
    setFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("statement", file);

    try {
      const res = await fetch("/api/statements/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="view">
      <div className="topbar">
        <div className="page-title">Statements</div>
        <div className="page-note">August 2026</div>
      </div>

      <div className="stmt-body">
        <div
          className={`dropzone ${dragOver ? "over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => handleFile(e.target.files)}
          />
          <div className="dropzone-title">PhonePe statement upload karo</div>
          <div className="dropzone-sub">
            PDF drag karo yaha, ya neeche se select karo
          </div>
          {file ? (
            <div className="file-chip">📄 {file.name}</div>
          ) : (
            <button type="button" className="upload-btn">
              Choose file
            </button>
          )}
        </div>

        {file && !result && (
          <button
            type="button"
            className="upload-btn"
            onClick={handleUpload}
            disabled={loading}
            style={{ marginBottom: 20, display: "block" }}
          >
            {loading ? "⏳ Extract ho raha hai..." : "Upload & Extract"}
          </button>
        )}

        {error && <div className="alert error">{error}</div>}

        {result && (
          <div className="panel">
            <div className="panel-title">
              Extracted Raw Text
              <span
                className="tag"
                style={{ marginLeft: 10, verticalAlign: "middle" }}
              >
                {result.fileName} · {result.totalPages} page(s)
              </span>
            </div>
            <pre className="raw-text">{result.rawText}</pre>
          </div>
        )}

        <div className="stat-row">
          <div className="stat-card">
            <div className="stat-label">Total Spent</div>
            <div className="stat-value debit">₹18,650</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Received</div>
            <div className="stat-value credit">₹32,000</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Ledger Score</div>
            <div className="stat-value">74 / 100</div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">Category Breakdown</div>
          {DEMO_CATEGORIES.map((c) => (
            <div className="bar-row" key={c.label}>
              <div className="bar-label">{c.label}</div>
              <div className="bar-track">
                <div
                  className={`bar-fill ${c.brass ? "brass" : ""}`}
                  style={{ width: `${c.width}%` }}
                ></div>
              </div>
              <div className="bar-amt">{c.value}</div>
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="panel-title">Transactions</div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Merchant</th>
                <th>Category</th>
                <th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_TXN.map((t, i) => (
                <tr key={i}>
                  <td>{t.date}</td>
                  <td>{t.merchant}</td>
                  <td>
                    <span className="tag">{t.category}</span>
                  </td>
                  <td className={`amt ${t.type}`}>{t.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ask-ai">
            <span>Is data pe koi sawaal poochna hai?</span>
            <Link to="/chat">
              <button type="button">Ask AI →</button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}