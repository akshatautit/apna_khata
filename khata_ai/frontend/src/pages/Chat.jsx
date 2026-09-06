import { useState } from "react";

const SEED = [
  {
    role: "bot",
    text: "Hi Akshata — poocho kuch bhi apne spending ke baare mein, ya koi statement upload karo Statements tab se.",
  },
  {
    role: "user",
    text: "August mein sabse zyada kharch kahan hua?",
  },
  {
    role: "bot",
    text: (
      <>
        Is mahine tumne sabse zyada <b>Food &amp; Delivery</b> pe kharch kiya —{" "}
        <span className="amt">₹4,320</span>, total spend{" "}
        <span className="amt">₹18,650</span> ka 23%. Zomato akela{" "}
        <span className="amt">₹2,100</span> tha.
      </>
    ),
  },
  {
    role: "user",
    text: "rent kitna gaya?",
  },
  {
    role: "bot",
    text: (
      <>
        Rent: <span className="amt">₹9,000</span>, 1st August ko debit hua.
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
          placeholder="Apna sawaal likho..."
        />
        <button type="submit" className="icon-btn send-btn" disabled={!input.trim()}>
          ➤
        </button>
      </form>
    </div>
  );
}