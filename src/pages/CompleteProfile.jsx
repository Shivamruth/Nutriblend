import { useState, useEffect } from "react";
import { supabase } from "../supabase/Client";

export default function CompleteProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
  });

  useEffect(() => {
    getUser();
  }, []);

  const getUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.full_name || !form.phone) {
      alert("Fill all fields");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("profiles").insert([
      {
        id: user.id,
        email: user.email,
        full_name: form.full_name,
        phone: form.phone,
      },
    ]);

    if (error) {
      alert(error.message);
      setLoading(false);
    } else {
      window.location.reload(); // 🔥 go to Home via App.jsx logic
    }
  };

  if (!user) {
    return (
      <div className="login-wrapper">
        <div className="login-container">
          <div className="login-card">
            <div className="login-spinner" style={{ margin: "40px auto" }} />
            <p style={{ textAlign: "center", color: "var(--muted)" }}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />

        <div className="login-card">
          {/* Brand */}
          <div className="login-brand">
            <span className="login-brand-icon">🥤</span>
            <h1 className="login-brand-title">NUTRIBLEND</h1>
          </div>

          <h2 className="login-title">Complete Your Profile</h2>
          <p className="login-subtitle">
            Just a few more details to get you started
          </p>

          <div className="login-form">
            <div className="login-input-group">
              <label className="login-label" htmlFor="profile-name">Full Name</label>
              <input
                id="profile-name"
                name="full_name"
                placeholder="John Doe"
                onChange={handleChange}
                value={form.full_name}
              />
            </div>

            <div className="login-input-group">
              <label className="login-label" htmlFor="profile-phone">Phone Number</label>
              <input
                id="profile-phone"
                name="phone"
                placeholder="9876543210"
                onChange={handleChange}
                value={form.phone}
              />
            </div>

            <button
              className="login-primary-btn"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? <span className="login-spinner" /> : "Save & Continue →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}