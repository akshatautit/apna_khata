import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Chat from "./pages/Chat";
import Statements from "./pages/Statements";
import History from "./pages/History";
import Login from "./pages/Login";
import Register from "./pages/Register";
import "./App.css";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function Sidebar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    sessionStorage.removeItem("khata_chat");
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">Khaata AI</div>
        <div className="brand-sub">smart money insights</div>
      </div>
      <nav className="nav">
        {isAuthenticated && (
          <>
            <NavLink to="/statements" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
              <span className="nav-dot"></span>Statements
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
              <span className="nav-dot"></span>History
            </NavLink>
            <NavLink to="/chat" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
              <span className="nav-dot"></span>Chat
            </NavLink>
          </>
        )}
        {!isAuthenticated && (
          <>
            <NavLink to="/login" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
              <span className="nav-dot"></span>Login
            </NavLink>
            <NavLink to="/register" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
              <span className="nav-dot"></span>Register
            </NavLink>
          </>
        )}
      </nav>
      <div className="sidebar-foot">
        {isAuthenticated ? (
          <>
            <div className="sidebar-user">{user?.name || user?.email || "Signed in"}</div>
            <button type="button" className="logout-btn" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          "Guest"
        )}
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app">
          <Sidebar />
          <main className="main">
            <Routes>
              <Route path="/" element={<Navigate to={localStorage.getItem("khata_token") ? "/statements" : "/login"} replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/statements" element={<ProtectedRoute><Statements /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}