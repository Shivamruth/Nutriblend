import { useState } from "react";
import { FaApple, FaFacebookF } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

import { supabase } from "../supabase/Client";

const oauthProviders = [
  { label: "Google", provider: "google", icon: <FcGoogle size={21} /> },
  { label: "Microsoft", provider: "azure", icon: <span className="login-ms-mark" /> },
  { label: "Apple", provider: "apple", icon: <FaApple size={22} /> },
  { label: "Facebook", provider: "facebook", icon: <FaFacebookF size={18} /> },
];

const features = [
  { icon: "01", label: "Protein products" },
  { icon: "02", label: "Monthly plans" },
  { icon: "03", label: "Delivery tracking" },
];

export default function Login() {
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
      alert("Enter email and password");
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
          alert(error.message);
          return;
        }

        alert("Signup successful! Please login now.");
        setIsSignup(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });

        if (error) {
          alert(error.message);
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Something went wrong. Please try again.");
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
        alert(error.message);
      }
    } catch (error) {
      console.error(`${label} login error:`, error);
      alert(`${label} login failed. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <section className="login-panel" aria-label="NutriBlend overview">
          <div className="login-panel-header">
            <img src="/nutriblend-logo.svg" alt="" className="login-panel-logo" />
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
                    onClick={() => alert("Password reset will be available soon.")}
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

            <div className="login-social-grid">
              {oauthProviders.map((item) => (
                <button
                  type="button"
                  className="login-social-btn"
                  key={item.provider}
                  onClick={() => handleOAuthLogin(item.provider, item.label)}
                  disabled={loading}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
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
