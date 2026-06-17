import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { useNotification } from "../context/NotificationContext";

import { supabase } from "../supabase/Client";

const features = [
  { icon: "01", label: "Protein products" },
  { icon: "02", label: "Monthly plans" },
  { icon: "03", label: "Delivery tracking" },
];

export default function Login() {
  const { notify } = useNotification();
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleEmailAuth = async () => {
    if (!form.email.trim() || !form.password.trim()) {
      notify("Enter email and password", "error");
      return;
    }

    try {
      setLoading(true);

      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
        });

        if (error) {
          notify(error.message, "error");
          return;
        }

        notify("Signup successful! Please login now. ✅", "success");
        setIsSignup(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });

        if (error) {
          notify(error.message, "error");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      notify("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider, label) => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        notify(error.message, "error");
      }
    } catch (error) {
      console.error(`${label} login error:`, error);
      notify(`${label} login failed. Please try again.`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <section className="login-panel" aria-label="NutriBlend overview">
          <div className="login-panel-header">
            <img
              src="/nutriblend-logo.svg"
              alt=""
              className="login-panel-logo"
              decoding="async"
              fetchPriority="high"
              width="64"
              height="64"
            />
            <div>
              <p className="login-panel-brand">NUTRIBLEND</p>
              <span>Premium fitness nutrition</span>
            </div>
          </div>

          <div className="login-panel-copy">
            <h2>Fresh nutrition, monthly plans, and order tracking in one place.</h2>
            <p className="login-panel-subtitle">
              Order protein shakes, manage monthly plans, and track deliveries from one dashboard.
            </p>
          </div>
          <div className="login-panel-list">
            {features.map((feature) => (
              <span key={feature.label}>
                <strong>{feature.icon}</strong>
                {feature.label}
              </span>
            ))}
          </div>
        </section>

        <div className="login-card">
          <h2 className="login-title">
            {isSignup ? "Create your account" : "Welcome back"}
          </h2>

          <p className="login-subtitle">
            {isSignup
              ? "Start ordering, planning, and tracking your nutrition."
              : "Sign in to continue with your orders and fitness plans."}
          </p>

          <div className="login-form">
            <div className="login-input-group">
              <label className="login-label" htmlFor="login-email">
                Email
              </label>

              <input
                id="login-email"
                type="email"
                name="email"
                placeholder="you@example.com"
                onChange={handleChange}
                value={form.email}
                autoComplete="email"
              />
            </div>

            <div className="login-input-group">
              <div className="login-label-row">
                <label className="login-label" htmlFor="login-password">
                  Password
                </label>
                {!isSignup && (
                  <button
                    type="button"
                    className="login-forgot-btn"
                    onClick={() => notify("Password reset will be available soon.", "info")}
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              <input
                id="login-password"
                type="password"
                name="password"
                placeholder="Enter your password"
                onChange={handleChange}
                value={form.password}
                autoComplete={isSignup ? "new-password" : "current-password"}
              />
            </div>

            <button
              type="button"
              className="login-primary-btn"
              onClick={handleEmailAuth}
              disabled={loading}
            >
              {loading ? (
                <span className="login-spinner" />
              ) : isSignup ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </button>

            <div className="login-divider">
              <span>or continue with</span>
            </div>

            <button
              type="button"
              className="login-social-btn login-google-btn"
              onClick={() => handleOAuthLogin("google", "Google")}
              disabled={loading}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "13px 20px",
              }}
            >
              <FcGoogle size={21} />
              <span>Continue with Google</span>
            </button>
          </div>

          <p className="login-switch">
            {isSignup ? "Already have an account?" : "New to NutriBlend?"}{" "}
            <button
              type="button"
              className="login-switch-link"
              onClick={() => setIsSignup((prev) => !prev)}
            >
              {isSignup ? "Sign In" : "Create Account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
