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
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEmailAuth = async () => {
    if (!form.email || !form.password) {
      alert("Enter email & password");
      return;
    }

    setLoading(true);

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (error) alert(error.message);
      else alert("Signup successful! Now login.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (error) alert(error.message);
    }

    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        {/* Decorative floating orbs */}
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />

        <div className="login-card">
          {/* Brand */}
          <div className="login-brand">
            <span className="login-brand-icon">🥤</span>
            <h1 className="login-brand-title">NUTRIBLEND</h1>
            <p className="login-brand-tagline">Fuel Your Fitness Journey</p>
          </div>

          {/* Title */}
          <h2 className="login-title">
            {isSignup ? "Create Account" : "Welcome Back"} 💪
          </h2>
          <p className="login-subtitle">
            {isSignup
              ? "Start your protein-powered journey today"
              : "Sign in to continue your fitness goals"}
          </p>

          {/* Form */}
          <div className="login-form">
            <div className="login-input-group">
              <label className="login-label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                name="email"
                placeholder="you@example.com"
                onChange={handleChange}
                value={form.email}
              />
            </div>

            <div className="login-input-group">
              <label className="login-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                name="password"
                placeholder="••••••••"
                onChange={handleChange}
                value={form.password}
              />
            </div>

            <button
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

            {/* Divider */}
            <div className="login-divider">
              <span>or continue with</span>
            </div>

            {/* Google */}
            <button className="login-social-btn" onClick={handleGoogleLogin}>
              <FcGoogle size={22} />
              <span>Google</span>
            </button>
          </div>

          {/* Switch */}
          <p className="login-switch">
            {isSignup ? "Already have an account?" : "New to NutriBlend?"}{" "}
            <span
              className="login-switch-link"
              onClick={() => setIsSignup(!isSignup)}
            >
              {isSignup ? "Sign In" : "Create Account"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}