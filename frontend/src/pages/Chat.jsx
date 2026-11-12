import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";

const CHAT_STORAGE_KEY = "khata_chat";

function loadChat(userId) {
  try {
    const all = JSON.parse(sessionStorage.getItem(CHAT_STORAGE_KEY) || "{}");
    return Array.isArray(all[userId]) ? all[userId] : [];
  } catch {
    return [];
  }
}

function saveChat(userId, messages) {
  try {
    const all = JSON.parse(sessionStorage.getItem(CHAT_STORAGE_KEY) || "{}");
    all[userId] = messages;
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // The conversation still works for this visit if storage is full.
  }
}

const API_BASE = import.meta.env.VITE_API_URL || "";

const CATEGORIES = [
  "Food",
  "Grocery",
  "Transport",
  "Bills & Utilities",
  "Entertainment",
  "Shopping",
  "Health",
  "Rent",
  "Salary",
  "Transfer",
  "ATM",
  "Other",
];

const CAT_STYLES = {
  Food: { dot: "#E8703A" },
  Grocery: { dot: "#52A05E" },
  Transport: { dot: "#3E7FB5" },
  "Bills & Utilities": { dot: "#B08A2E" },
  Entertainment: { dot: "#8E5BB5" },
  Shopping: { dot: "#C05A7E" },
  Health: { dot: "#3E8E8E" },
  Rent: { dot: "#7A6A5A" },
  Salary: { dot: "#4E7A3A" },
  Transfer: { dot: "#7A7FA0" },
  ATM: { dot: "#5A5A5A" },
  Other: { dot: "#9AA0A6" },
};

function catDot(name) {
  return CAT_STYLES[name]?.dot || CAT_STYLES.Other.dot;
}

function categoriesInStatement(statement) {
  const counts = new Map();
  for (const c of statement?.summary?.categories || []) {
    if (c?.name) counts.set(c.name, c.count || 0);
  }
  if (counts.size === 0) {
    for (const t of statement?.transactions || []) {
      if (!t?.category) continue;
      counts.set(t.category, (counts.get(t.category) || 0) + 1);
    }
  }
  return CATEGORIES.filter((name) => (counts.get(name) || 0) > 0);
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

export default function Chat() {
  const { user } = useAuth();
  const userId = user?.id || "";
  const [messages, setMessages] = useState(() => loadChat(user?.id || ""));
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [hasStatement, setHasStatement] = useState(null); // null = unknown
  const [latest, setLatest] = useState(null);
  const bottomRef = useRef(null);
  const categoryChips = categoriesInStatement(latest);

  useEffect(() => {
    api
      .get(`/api/statements/history`)
      .then((r) => {
        const first = r.data.entries?.[0];
        setHasStatement(Boolean(first));
        setLatest(first || null);
      })
      .catch(() => setHasStatement(false));
  }, []);

  useEffect(() => {
    if (!userId) return;
    saveChat(userId, messages);
  }, [messages, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function sendMessage(text) {
    const trimmed = (text || input).trim();
    if (!trimmed || thinking) return;

    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");
    setThinking(true);

    try {
      const res = await api.post(`/api/chat/message`, {
        message: trimmed,
      });
      setMessages((m) => [
        ...m,
        { role: "bot", text: res.data.message, reply: res.data },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: "Something went wrong. Is the backend running?",
          reply: { type: "error" },
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  function analysisHasBullets(reply) {
    if (reply?.type !== "analysis" || !reply.message) return false;
    const bullets = reply.message
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("- ") || line.startsWith("• "));
    return bullets.length >= 2;
  }

  function renderSummary(reply) {
    const s = reply.summary;
    if (!s) return null;
    return (
      <div className="msg-summary">
        <div className="msg-stat">
          <span className="msg-stat-label">Spent</span>
          <span className="msg-stat-val debit">{formatINR(s.totalSpent)}</span>
        </div>
        <div className="msg-stat">
          <span className="msg-stat-label">Received</span>
          <span className="msg-stat-val credit">{formatINR(s.totalReceived)}</span>
        </div>
        <div className="msg-stat">
          <span className="msg-stat-label">Net</span>
          <span className={`msg-stat-val ${(s.net || 0) >= 0 ? "credit" : "debit"}`}>
            {formatINR(s.net)}
          </span>
        </div>
        <div className="msg-stat">
          <span className="msg-stat-label">Score</span>
          <span className="msg-stat-val">{s.ledgerScore}/100</span>
        </div>
        <div className="msg-stat">
          <span className="msg-stat-label">Txns</span>
          <span className="msg-stat-val">{s.transactionCount}</span>
        </div>
      </div>
    );
  }

  function renderReply(reply) {
    if (!reply) return null;
    if (reply.type === "category" && reply.transactions?.length) {
      return (
        <div className="msg-table-wrap">
          <div className="msg-cat-line">
            <span className="cat-dot" style={{ background: catDot(reply.category) }} />
            <b>{reply.title}</b>
            <span className="msg-flow">
              spent {formatINR(reply.spent)} · received {formatINR(reply.received)}
            </span>
          </div>
          <table className="msg-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Merchant</th>
                <th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {reply.transactions.map((t) => (
                <tr key={`${t.sno}-${t.merchant}`}>
                  <td className="mono">{t.date}</td>
                  <td className="merchant">{t.merchant}</td>
                  <td className={`amt ${t.type}`}>
                    {t.type === "credit" ? "+" : "−"}
                    {formatINR(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reply.count > 50 && (
            <div className="msg-note">Showing first 50 of {reply.count}.</div>
          )}
        </div>
      );
    }
    if (reply.type === "list") {
      if (!reply.items?.length) return null;
      return (
        <>
          <ul className="msg-list">
            {reply.items.map((t) => (
              <li key={`${t.date}-${t.merchant}-${t.amount}`}>
                <span className="mono">{t.date}</span>
                {" · "}
                {t.merchant}
                {t.category ? ` · ${t.category}` : ""}
                {" · "}
                <span className={`amt ${t.type}`}>
                  {t.type === "credit" ? "+" : "−"}
                  {formatINR(t.amount)}
                </span>
              </li>
            ))}
          </ul>
          {reply.count > reply.items.length && (
            <div className="msg-note">Showing first {reply.items.length} of {reply.count}.</div>
          )}
        </>
      );
    }
    if (reply.type === "summary" && reply.focus === "overview") {
      return renderSummary(reply);
    }
    if (reply.type === "analysis" && reply.message) {
      const lines = reply.message.split("\n").map((line) => line.trim()).filter(Boolean);
      const bullets = lines.filter((line) => line.startsWith("- ") || line.startsWith("• "));
      if (bullets.length >= 2) {
        const intro = lines.filter((line) => !line.startsWith("- ") && !line.startsWith("• ")).join(" ");
        return (
          <>
            {intro ? <div>{intro}</div> : null}
            <ul className="msg-list">
              {bullets.map((line) => (
                <li key={line}>{line.replace(/^(- |• )/, "")}</li>
              ))}
            </ul>
          </>
        );
      }
    }
    return null;
  }

  return (
    <div className="view">
      <div className="topbar">
        <div className="page-title">Chat</div>
        <div className="page-note">
          {hasStatement === true
            ? `Analysing · ${latest?.fileName}`
            : hasStatement === false
              ? "No statement yet"
              : "Connecting…"}
        </div>
      </div>

      <div className="chat-body">
        {hasStatement === true && latest && (
          <div className="msg file">
            <div className="file-icon">📄</div>
            <span>
              {latest.fileName} · <span className="amt">{latest.transactionCount}</span> txns
            </span>
          </div>
        )}

        {messages.length === 0 && hasStatement === true && (
          <div className="msg bot">
            Hi! I can answer questions about <b>{latest?.fileName}</b>.
            {categoryChips.length
              ? " Pick a category below, ask “total spent”, or type a normal question."
              : " Ask “total spent”, or type a normal question."}
          </div>
        )}

        {hasStatement === false && messages.length === 0 && (
          <div className="msg bot">
            No statement uploaded yet.{" "}
            <Link to="/statements" style={{ color: "inherit", fontWeight: 600 }}>
              Upload a PDF →
            </Link>
          </div>
        )}

        {messages.map((m, i) => {
          const fromGemini = m.reply?.type === "analysis";
          return (
            <div key={i} className={`msg ${m.role}${m.role === "bot" ? (fromGemini ? " ai" : " fn") : ""}`}>
              {m.reply?.type === "analysis" && analysisHasBullets(m.reply) ? null : m.text}
              {m.role === "bot" && renderReply(m.reply)}
            </div>
          );
        })}

        {thinking && (
          <div className="msg bot">
            <span className="typing">…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-inputs">
        {hasStatement === true && (
          <div className="quick-replies">
            <button
              type="button"
              className="quick-btn"
              onClick={() => sendMessage("Overview")}
            >
              Overview
            </button>
            {categoryChips.map((c) => (
              <button
                key={c}
                type="button"
                className="quick-btn"
                onClick={() => sendMessage(c)}
              >
                <span className="cat-dot" style={{ background: catDot(c) }} />
                {c}
              </button>
            ))}
          </div>
        )}
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              hasStatement === true
                ? "Ask about your latest statement…"
                : "Upload a statement first"
            }
            disabled={hasStatement !== true}
          />
          <button
            type="submit"
            className="icon-btn send-btn"
            disabled={!input.trim() || thinking || hasStatement !== true}
          >
            ➤
          </button>
        </form>
      </div>
    </div>
  );
}