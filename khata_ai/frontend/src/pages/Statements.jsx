import { useState, useRef } from "react";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "";

const CAT_STYLES = {
  Food: { dot: "#E8703A", pill: "#FBEDE4" },
  Grocery: { dot: "#52A05E", pill: "#E7F3E9" },
  Transport: { dot: "#3E7FB5", pill: "#E6F0F8" },
  "Bills & Utilities": { dot: "#B08A2E", pill: "#F7F0DE" },
  Entertainment: { dot: "#8E5BB5", pill: "#F0E7F8" },
  Shopping: { dot: "#C05A7E", pill: "#F9E8EF" },
  Health: { dot: "#3E8E8E", pill: "#E4F2F2" },
  Rent: { dot: "#7A6A5A", pill: "#F0ECE6" },
  Salary: { dot: "#4E7A3A", pill: "#EAF3E3" },
  Transfer: { dot: "#7A7FA0", pill: "#ECEDF4" },
  ATM: { dot: "#5A5A5A", pill: "#ECECEC" },
  Other: { dot: "#9AA0A6", pill: "#F0F1F2" },
};

function catStyle(name) {
  return CAT_STYLES[name] || CAT_STYLES.Other;
}

function formatINR(amount) {
  return (
    "₹" +
    Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export default function Statements() {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [activeCat, setActiveCat] = useState(null);
  const fileInputRef = useRef(null);

  function handleFile(selected) {
    const f = selected?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("Please select a PDF file.");
      setFile(null);
      return;
    }
    setError("");
    setResult(null);
    setFile(f);
  }

  function clearAll() {
    setFile(null);
    setResult(null);
    setError("");
    setActiveCat(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("statement", file);

    try {
      const res = await fetch(`${API_BASE}/api/statements/upload`, {
        method: "POST",
        body: formData,
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Server response was not JSON. Is the backend running?");
      }
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
        <div className="page-note">Upload a PDF to analyse your spending</div>
      </div>

      <div className="stmt-body">
        <div
          className={`dropzone ${dragOver ? "over" : ""} ${file ? "has-file" : ""}`}
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
          {file ? (
            <div className="dz-picked">
              <div className="dz-check">✓</div>
              <div className="dz-filename">{file.name}</div>
              <div className="dz-filemeta">
                {(file.size / 1024 / 1024).toFixed(2)} MB · ready to upload
              </div>
            </div>
          ) : (
            <>
              <div className="dz-icon">
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div className="dropzone-title">Upload your statement</div>
              <div className="dropzone-sub">Drag &amp; drop a PDF here, or click to choose a file</div>
              <button type="button" className="upload-btn">
                Choose file
              </button>
            </>
          )}
        </div>

        {file && !result && (
          <div className="upload-actions">
            <button
              type="button"
              className="upload-btn primary"
              onClick={handleUpload}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spin">⏳</span> Extracting…
                </>
              ) : (
                "Upload & Extract"
              )}
            </button>
            <button type="button" className="upload-btn ghost" onClick={clearAll}>
              Remove
            </button>
          </div>
        )}

        {error && <div className="alert error">{error}</div>}

        {result && (
          <div className="result-bar">
            <div className="result-info">
              <div className="result-file">{result.fileName}</div>
              <div className="result-meta">
                {result.totalPages} page(s) · {result.summary.transactionCount} transactions
              </div>
            </div>
            <button
              type="button"
              className="clear-all-btn"
              title="Delete this statement and start over"
              onClick={clearAll}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Clear statement
            </button>
          </div>
        )}

        {result && (
          <div className="stat-row">
            <div className="stat-card accent-debit">
              <div className="stat-label">Total Spent</div>
              <div className="stat-value debit">{formatINR(result.summary.totalSpent)}</div>
              <div className="stat-hint">outgoing</div>
            </div>
            <div className="stat-card accent-credit">
              <div className="stat-label">Total Received</div>
              <div className="stat-value credit">{formatINR(result.summary.totalReceived)}</div>
              <div className="stat-hint">incoming</div>
            </div>
            <div className="stat-card accent-net">
              <div className="stat-label">Net Balance</div>
              <div className={`stat-value ${result.summary.net >= 0 ? "credit" : "debit"}`}>
                {formatINR(result.summary.net)}
              </div>
              <div className="stat-hint">{result.summary.net >= 0 ? "in surplus" : "in deficit"}</div>
            </div>
            <div className="stat-card accent-score">
              <div className="stat-label">Ledger Score</div>
              <div className="stat-value">{result.summary.ledgerScore} <span className="stat-unit">/100</span></div>
              <div className="stat-hint">savings health</div>
            </div>
          </div>
        )}

        {result && (
          <div className="panel">
            <div className="panel-title">
              Category Breakdown
              {activeCat && (
                <button
                  type="button"
                  className="clear-btn"
                  onClick={() => setActiveCat(null)}
                  title="Show all categories"
                  style={{ marginLeft: 10 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Clear filter
                </button>
              )}
            </div>
            {result.summary.categories.length === 0 ? (
              <div className="page-note">No transactions found.</div>
            ) : (
              <table className="cat-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th style={{ textAlign: "right" }}>Debit (spend)</th>
                    <th style={{ textAlign: "right" }}>Credit (received)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.summary.categories.map((c) => (
                    <tr
                      key={c.name}
                      className={`cat-row ${activeCat === c.name ? "active" : ""}`}
                      onClick={() => setActiveCat(activeCat === c.name ? null : c.name)}
                    >
                      <td>
                        <span className="cat-dot" style={{ background: catStyle(c.name).dot }} />
                        {c.name}
                        <span className="cat-count">{c.count}</span>
                      </td>
                      <td className={`amt ${c.spent > 0 ? "debit" : ""}`}>
                        {c.spent > 0 ? formatINR(c.spent) : "—"}
                      </td>
                      <td className={`amt ${c.received > 0 ? "credit" : ""}`}>
                        {c.received > 0 ? formatINR(c.received) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="category-hint">
              Click a category to filter the <b>Transactions</b> list below. Click again to show all.
            </div>
          </div>
        )}

        {result && (
          <div className="panel">
            <div className="panel-title">
              Transactions{activeCat ? ` — ${activeCat}` : ""}
              {activeCat && (
                <span className="category-badge">
                  <span className="cat-dot" style={{ background: catStyle(activeCat).dot }} />
                  filtered view
                </span>
              )}
            </div>
            {(() => {
              const filtered = activeCat
                ? result.transactions.filter((t) => t.category === activeCat)
                : result.transactions;
              if (filtered.length === 0) {
                return <div className="page-note">No transactions in this category.</div>;
              }
              return (
                <div className="table-wrap">
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
                      {filtered.slice(0, 50).map((t) => {
                        const style = catStyle(t.category);
                        return (
                          <tr key={`${t.sno}-${t.merchant}`}>
                            <td className="mono">{t.date}</td>
                            <td className="merchant">{t.merchant}</td>
                            <td>
                              <span className="cat-pill" style={{ color: style.dot, background: style.pill }}>
                                <span className="cat-dot" style={{ background: style.dot }} />
                                {t.category}
                              </span>
                            </td>
                            <td className={`amt ${t.type}`}>
                              {t.type === "credit" ? "+" : "−"}
                              {formatINR(t.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
            <div className="ask-ai">
              <span>Have a question about this data?</span>
              <Link to="/chat">
                <button type="button">Ask AI →</button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}