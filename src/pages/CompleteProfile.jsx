import { useState, useEffect } from "react";
import { supabase } from "../supabase/Client";

export default function CompleteProfile() {
  const [user, setUser] = useState(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
  });

  useEffect(() => {
    const getUser = async () => {
      try {
        setCheckingUser(true);

        const { data, error } = await supabase.auth.getUser();

        if (error || !data?.user) {
          console.error("Profile user error:", error?.message);
          setUser(null);
          return;
        }

        setUser(data.user);
      } catch (error) {
        console.error("Get user failed:", error);
        setUser(null);
      } finally {
        setCheckingUser(false);
      }
    };

    getUser();
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async () => {
    if (!user) {
      alert("User not found. Please login again.");
      return;
    }

    if (!form.full_name.trim() || !form.phone.trim()) {
      alert("Fill all fields");
      return;
    }

    if (form.phone.trim().length < 10) {
      alert("Enter a valid phone number");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from("profiles").upsert(
        [
          {
            id: user.id,
            email: user.email,
            full_name: form.full_name.trim(),
            phone: form.phone.trim(),
            role: "customer",
          },
        ],
        {
          onConflict: "id",
        }
      );

      if (error) {
        alert(error.message);
        return;
      }

      window.location.href = "/";
    } catch (error) {
      console.error("Profile save error:", error);
      alert("Could not save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingUser) {
    return (
      <div className="login-wrapper">
        <div className="login-container">
          <div className="login-card">
            <div className="login-spinner" style={{ margin: "40px auto" }} />
            <p style={{ textAlign: "center", color: "var(--muted)" }}>
              Loading...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="login-wrapper">
        <div className="login-container">
          <div className="login-card">
            <h2 className="login-title">Session not found</h2>
            <p className="login-subtitle">
              Please login again to complete your profile.
            </p>
            <button
              className="login-primary-btn"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              Go to Login
            </button>
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
              <label className="login-label" htmlFor="profile-name">
                Full Name
              </label>

              <input
                id="profile-name"
                name="full_name"
                placeholder="John Doe"
                onChange={handleChange}
                value={form.full_name}
              />
            </div>

            <div className="login-input-group">
              <label className="login-label" htmlFor="profile-phone">
                Phone Number
              </label>

              <input
                id="profile-phone"
                name="phone"
                type="tel"
                placeholder="9876543210"
                onChange={handleChange}
                value={form.phone}
              />
            </div>

            <button
              type="button"
              className="login-primary-btn"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <span className="login-spinner" />
              ) : (
                "Save & Continue →"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}