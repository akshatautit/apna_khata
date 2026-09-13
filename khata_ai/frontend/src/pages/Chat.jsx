import { useState } from "react";

const SEED = [
  {
    role: "bot",
    text: "Hi Akshata — ask me anything about your spending, or upload a statement from the Statements tab.",
  },
  {
    role: "user",
    text: "Where did I spend the most in August?",
  },
  {
    role: "bot",
    text: (
      <>
        You spent the most on <b>Food &amp; Delivery</b> —{" "}
        <span className="amt">₹4,320</span>, which is 23% of your total spend{" "}
        <span className="amt">₹18,650</span>. Zomato alone was{" "}
        <span className="amt">₹2,100</span>.
      </>
    ),
  },
  {
    role: "user",
    text: "How much was rent?",
  },
  {
    role: "bot",
    text: (
      <>
        Rent: <span className="amt">₹9,000</span>, debited on 1 August.
      </>
    ),
  },
];

export default function Chat() {
  const [messages, setMessages] = useState(SEED);
  const [input, setInput] = useState("");

  function send(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages([...messages, { role: "user", text: input }]);
    setInput("");
  }

  return (
    <div className="view">
      <div className="topbar">
        <div className="page-title">Chat</div>
        <div className="page-note">Gemini · connected</div>
      </div>

      <div className="chat-body">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.text}
          </div>
        ))}
        <div className="msg file">
          <div className="file-icon">📄</div>
          <span>phonepe_august.pdf · <span className="amt">42</span> txn</span>
        </div>
      </div>

      <form className="composer" onSubmit={send}>
        <button type="button" className="icon-btn" title="Attach file (soon)">
          📎
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question…"
        />
        <button type="submit" className="icon-btn send-btn" disabled={!input.trim()}>
          ➤
        </button>
      </form>
    </div>
  );
}