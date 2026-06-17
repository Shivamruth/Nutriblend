import { useState, useCallback } from "react";
import { Shield, Eye, EyeOff, Lock, Mail, BarChart3, Package, Truck, ShieldCheck } from "lucide-react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";
import "../styles/admin-login.css";

const FEATURES = [
  { icon: "📦", label: "Order Management", desc: "Track and update customer orders" },
  { icon: "📊", label: "Revenue Analytics", desc: "Sales charts and CSV exports" },
  { icon: "🏷️", label: "Inventory Control", desc: "Products, plans, and stock" },
  { icon: "🚚", label: "Delivery Tracking", desc: "Assign partners and track GPS" },
];

export default function AdminLogin({ setPage }) {
  const { notify } = useNotification();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError || !signInData?.user) {
        setError("Invalid credentials. Please try again.");
        setLoading(false);
        return;
      }

      // Verify admin role using the user ID from sign-in (no extra getUser call)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", signInData.user.id)
        .single();

      if (profileError || profile?.role !== "admin") {
        await supabase.auth.signOut();
        setError("Access denied. Admin credentials required.");
        setLoading(false);
        return;
      }

      notify("Welcome to Admin Dashboard! ✅", "success");
      setPage("admin");
    } catch (err) {
      console.error("Admin login error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [email, password, notify, setPage]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !loading) {
      handleLogin();
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-orb admin-login-orb-1" />
      <div className="admin-login-orb admin-login-orb-2" />

      <div className="admin-login-container">
        {/* ─── Left: Branding Panel ─── */}
        <div className="admin-login-panel">
          <div className="admin-login-panel-header">
            <div className="admin-login-shield">
              <Shield strokeWidth={2} />
            </div>
            <div className="admin-login-panel-brand">
              <strong>NUTRIBLEND</strong>
              <span>Control Center</span>
            </div>
          </div>

          <div className="admin-login-panel-copy">
            <h2>
              Manage your <span>business</span> from one dashboard
            </h2>
            <p>
              Access order management, revenue analytics, inventory control, and
              delivery partner operations from the NutriBlend admin panel.
            </p>
          </div>

          <div className="admin-login-features">
            {FEATURES.map((feature) => (
              <div className="admin-login-feature" key={feature.label}>
                <div className="admin-login-feature-icon">{feature.icon}</div>
                <div className="admin-login-feature-text">
                  <strong>{feature.label}</strong>
                  <span>{feature.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Right: Login Form ─── */}
        <div className="admin-login-form-panel">
          <div className="admin-login-form-badge">Secure Access</div>

          <h2 className="admin-login-form-title">Admin Sign In</h2>
          <p className="admin-login-form-subtitle">
            Enter your admin credentials to access the dashboard.
          </p>

          <div className="admin-login-form" onKeyDown={handleKeyDown}>
            <div className="admin-login-field">
              <label htmlFor="admin-email">Email Address</label>
              <div className="admin-login-input-wrap">
                <input
                  id="admin-email"
                  type="email"
                  placeholder="admin@nutriblend.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="admin-login-field">
              <label htmlFor="admin-password">Password</label>
              <div className="admin-login-input-wrap">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="admin-login-toggle-pw"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="admin-login-error">
                <ShieldCheck size={16} />
                {error}
              </div>
            )}

            <button
              type="button"
              className="admin-login-submit"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <span className="admin-login-spinner" />
              ) : (
                <>
                  <Lock size={18} />
                  Enter Admin Dashboard
                </>
              )}
            </button>
          </div>

          <div className="admin-login-footer">
            Not an admin?{" "}
            <button type="button" onClick={() => setPage?.("home")}>
              Go to Store
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}