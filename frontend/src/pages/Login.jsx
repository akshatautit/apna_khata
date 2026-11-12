import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/api/auth/login", { email, password });
      login(res.data);
      navigate("/statements", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="view">
      <div className="topbar">
        <div className="page-title">Login</div>
        <div className="page-note">Access your statements and history</div>
      </div>
      <div className="stmt-body">
        <div className="panel">
          <form onSubmit={handleSubmit} className="composer" style={{ display: "block" }}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
                style={{ width: "100%", marginBottom: 10 }}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="off"
                style={{ width: "100%", marginBottom: 10 }}
              />
            </label>
            {error && <div className="alert error">{error}</div>}
            <button type="submit" className="upload-btn primary" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>
        </div>
        <div className="page-note">
          New here? <a href="/register">Create an account</a>
        </div>
      </div>
    </div>
  );
}