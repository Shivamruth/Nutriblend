import { useState } from "react";
import { supabase } from "../supabase/Client";
import { FcGoogle } from "react-icons/fc";

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
          return;
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        alert(error.message);
      }
    } catch (error) {
      console.error("Google login error:", error);
      alert("Google login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />

        <div className="login-card">
          <div className="login-brand">
            <span className="login-brand-icon">🥤</span>
            <h1 className="login-brand-title">NUTRIBLEND</h1>
            <p className="login-brand-tagline">Fuel Your Fitness Journey</p>
          </div>

          <h2 className="login-title">
            {isSignup ? "Create Account" : "Welcome Back"} 💪
          </h2>

          <p className="login-subtitle">
            {isSignup
              ? "Start your protein-powered journey today"
              : "Sign in to continue your fitness goals"}
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
              <label className="login-label" htmlFor="login-password">
                Password
              </label>

              <input
                id="login-password"
                type="password"
                name="password"
                placeholder="••••••••"
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
              className="login-social-btn"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <FcGoogle size={22} />
              <span>Google</span>
            </button>
          </div>

          <p className="login-switch">
            {isSignup ? "Already have an account?" : "New to NutriBlend?"}{" "}
            <span
              className="login-switch-link"
              onClick={() => setIsSignup((prev) => !prev)}
            >
              {isSignup ? "Sign In" : "Create Account"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}