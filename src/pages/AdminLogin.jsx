import { useState } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";

export default function AdminLogin({ setPage }) {
  const { notify } = useNotification();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { notify("Enter credentials", "error"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      notify("Invalid credentials", "error");
    } else {
      notify("Welcome to Admin Dashboard! ✅", "success");
      setPage("admin");
    }
    setLoading(false);
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-card">
          <div className="login-brand">
            <span className="login-brand-icon">🛡️</span>
            <h1 className="login-brand-title">Admin Panel</h1>
          </div>
          <h2 className="login-title">Admin Login</h2>
          <p className="login-subtitle">Access the dashboard with admin credentials</p>
          <div className="login-form">
            <div className="login-input-group">
              <label className="login-label" htmlFor="admin-email">Email</label>
              <input id="admin-email" type="email" placeholder="admin@nutriblend.com" onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="login-input-group">
              <label className="login-label" htmlFor="admin-password">Password</label>
              <input id="admin-password" type="password" placeholder="••••••••" onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className="login-primary-btn" onClick={handleLogin} disabled={loading}>
              {loading ? "Signing in..." : "Sign In to Dashboard"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}