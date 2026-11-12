import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [name, setName] = useState("");
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
      const res = await api.post("/api/auth/register", { name, email, password });
      login(res.data);
      navigate("/statements", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Register failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="view">
      <div className="topbar">
        <div className="page-title">Register</div>
        <div className="page-note">Create your account</div>
      </div>
      <div className="stmt-body">
        <div className="panel">
          <form onSubmit={handleSubmit} className="composer" style={{ display: "block" }}>
            <label>
              Name (optional)
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                style={{ width: "100%", marginBottom: 10 }}
              />
            </label>
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
              Password (min 6 chars)
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                style={{ width: "100%", marginBottom: 10 }}
              />
            </label>
            {error && <div className="alert error">{error}</div>}
            <button type="submit" className="upload-btn primary" disabled={loading}>
              {loading ? "Creating account..." : "Register"}
            </button>
          </form>
        </div>
        <div className="page-note">
          Already have an account? <a href="/login">Login</a>
        </div>
      </div>
    </div>
  );
}