import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "";

function formatINR(amount) {
  return (
    "₹" +
    Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function History() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    axios
      .get(`${API_BASE}/api/statements/history`)
      .then((r) => setEntries(r.data.entries || []))
      .catch(() => setError("Could not load history."))
      .finally(() => setLoading(false));
  }, []);

  const groups = [];
  for (const e of entries) {
    const last = groups[groups.length - 1];
    if (last && last.date === e.uploadedDate) last.items.push(e);
    else groups.push({ date: e.uploadedDate, items: [e] });
  }

  const totalsFor = (items) =>
    items.reduce(
      (a, e) => ({
        spent: a.spent + (e.summary?.totalSpent || 0),
        received: a.received + (e.summary?.totalReceived || 0),
        txn: a.txn + (e.transactionCount || 0),
      }),
      { spent: 0, received: 0, txn: 0 }
    );

  return (
    <div className="view">
      <div className="topbar">
        <div className="page-title">History</div>
        <div className="page-note">Daily uploads, saved date-wise</div>
      </div>
      <div className="stmt-body">
        {loading && <div className="page-note">Loading history…</div>}
        {error && <div className="alert error">{error}</div>}

        {!loading && !error && entries.length === 0 && (
          <div className="panel">
            <div className="panel-title">No statements yet</div>
            <div className="page-note">
              Upload a PDF on the Statements page and it will appear here, grouped by the day it was uploaded.
            </div>
          </div>
        )}

        {groups.map((g) => {
          const t = totalsFor(g.items);
          return (
            <div className="hist-day" key={g.date}>
              <div className="hist-day-head">
                <div>
                  <div className="hist-date">{formatDay(g.date)}</div>
                  <div className="hist-day-sub">
                    {g.items.length} statement{g.items.length > 1 ? "s" : ""} · {t.txn} transactions
                  </div>
                </div>
                <div className="hist-day-totals">
                  <span className="hist-tot debit">spent {formatINR(t.spent)}</span>
                  <span className="hist-tot credit">received {formatINR(t.received)}</span>
                </div>
              </div>

              {g.items.map((e) => {
                const open = openId === e.id;
                const s = e.summary;
                return (
                  <div className={`hist-card ${open ? "open" : ""}`} key={e.id}>
                    <div
                      className="hist-head"
                      onClick={() => setOpenId(open ? null : e.id)}
                    >
                      <div className="hist-file">
                        <div className="hist-name">{e.fileName}</div>
                        <div className="hist-meta">
                          {formatTime(e.uploadedAt)} · {e.totalPages} page(s) · {e.transactionCount} txns
                        </div>
                      </div>
                      <div className="hist-stats">
                        <div className="hist-stat">
                          <span className="hist-stat-label">Spent</span>
                          <span className="hist-stat-val debit">{formatINR(s?.totalSpent)}</span>
                        </div>
                        <div className="hist-stat">
                          <span className="hist-stat-label">Received</span>
                          <span className="hist-stat-val credit">{formatINR(s?.totalReceived)}</span>
                        </div>
                        <div className="hist-stat">
                          <span className="hist-stat-label">Net</span>
                          <span className={`hist-stat-val ${(s?.net || 0) >= 0 ? "credit" : "debit"}`}>
                            {formatINR(s?.net)}
                          </span>
                        </div>
                        <div className="hist-stat">
                          <span className="hist-stat-label">Score</span>
                          <span className="hist-stat-val">{s?.ledgerScore}<span className="stat-unit">/100</span></span>
                        </div>
                      </div>
                      <div className={`hist-chev ${open ? "rot" : ""}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>

                    {open && (
                      <div className="hist-detail">
                        <div className="hist-detail-title">Category Breakdown</div>
                        <table className="cat-table">
                          <thead>
                            <tr>
                              <th>Category</th>
                              <th style={{ textAlign: "right" }}>Debit</th>
                              <th style={{ textAlign: "right" }}>Credit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(s?.categories || []).map((c) => (
                              <tr key={c.name}>
                                <td>{c.name}<span className="cat-count">{c.count}</span></td>
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

                        <div className="hist-detail-title">Transactions</div>
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
                              {(e.transactions || []).slice(0, 50).map((t) => (
                                <tr key={`${t.sno}-${t.merchant}`}>
                                  <td className="mono">{t.date}</td>
                                  <td className="merchant">{t.merchant}</td>
                                  <td>{t.category}</td>
                                  <td className={`amt ${t.type}`}>
                                    {t.type === "credit" ? "+" : "−"}
                                    {formatINR(t.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}