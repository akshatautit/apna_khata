import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import Chat from "./pages/Chat";
import Statements from "./pages/Statements";
import History from "./pages/History";
import "./App.css";

function Sidebar() {
  const links = [
    { to: "/chat", label: "Chat" },
    { to: "/statements", label: "Statements" },
    { to: "/history", label: "History" },
  ];
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">Khaata AI</div>
        <div className="brand-sub">samajhdaar kharcha</div>
      </div>
      <nav className="nav">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <span className="nav-dot"></span>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-foot">Akshata · logged in</div>
    </aside>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Sidebar />
        <main className="main">
          <Routes>
            <Route path="/" element={<Navigate to="/statements" replace />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/statements" element={<Statements />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}