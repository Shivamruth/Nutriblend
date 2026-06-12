import { useState } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";
import "../styles/gym-partner.css";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const benefits = [
  "Daily fresh protein shakes",
  "Pre and post-workout combos",
  "Bulk member pricing",
  "Custom gym-branded plans",
  "Direct delivery to gym",
];

const steps = [
  "Submit your gym details below",
  "Our team understands your daily demand",
  "We set customized pricing and plans",
  "Daily delivery or on-site counter setup",
];

const initialForm = {
  gymName: "",
  ownerName: "",
  mobile: "",
  city: "",
  expectedDailyOrders: "",
  message: "",
};

export default function GymPartner() {
  const { notify } = useNotification();
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextValue =
      name === "mobile" || name === "expectedDailyOrders"
        ? value.replace(/\D/g, "")
        : value;
    setForm((prev) => ({ ...prev, [name]: nextValue }));
  };

  const saveRequest = async (event) => {
    event.preventDefault();

    const required = [form.gymName, form.ownerName, form.mobile, form.city, form.expectedDailyOrders];
    if (required.some((v) => !String(v || "").trim())) {
      notify("Complete all required gym partner fields", "error");
      return;
    }

    if (!/^\d{10}$/.test(form.mobile)) {
      notify("Mobile number must be 10 digits", "error");
      return;
    }

    setLoading(true);

    try {
      // Try backend API first (saves to Supabase)
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE}/inquiries/gym`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token || ""}`,
        },
        credentials: "include",
        body: JSON.stringify({
          gymName: form.gymName,
          ownerName: form.ownerName,
          phone: form.mobile,
          city: form.city,
          expectedDailyOrders: form.expectedDailyOrders || null,
          notes: form.message || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to submit inquiry");
      }

      setForm(initialForm);
      setSubmitted(true);
      notify("Gym partner request submitted!", "success");
    } catch (err) {
      console.error("Gym inquiry error:", err);
      notify(err.message || "Could not submit request. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <main className="gym-partner-page">
        <section className="gym-partner-hero" style={{ textAlign: "center", padding: "80px 20px" }}>
          <p className="gym-partner-eyebrow">Request Received</p>
          <h2>Thank You for Partnering! 🤝</h2>
          <p style={{ maxWidth: 480, margin: "16px auto" }}>
            We received your gym partner request. Our team will reach out within 24–48 hours to
            discuss your requirements and customized plan.
          </p>
          <button
            type="button"
            style={{ marginTop: 24 }}
            onClick={() => setSubmitted(false)}
          >
            Submit Another Request
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="gym-partner-page">
      <section className="gym-partner-hero">
        <p className="gym-partner-eyebrow">Gym Collaboration</p>
        <h2>Partner With NutriBlend</h2>
        <p>Fresh Protein Shakes for Your Gym Members</p>
      </section>

      <div className="gym-partner-layout">
        <section className="gym-partner-panel">
          <div className="gym-partner-section-head">
            <p className="gym-partner-eyebrow">Benefits</p>
            <h3>Built for fitness businesses</h3>
          </div>

          <div className="gym-benefits-grid">
            {benefits.map((benefit) => (
              <div className="gym-benefit-card" key={benefit}>
                {benefit}
              </div>
            ))}
          </div>
        </section>

        <section className="gym-partner-panel">
          <div className="gym-partner-section-head">
            <p className="gym-partner-eyebrow">How it works</p>
            <h3>Simple setup flow</h3>
          </div>

          <div className="gym-steps-list">
            {steps.map((step, index) => (
              <div className="gym-step" key={step}>
                <span>Step {index + 1}</span>
                <strong>{step}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="gym-partner-form-card">
        <div className="gym-partner-section-head">
          <p className="gym-partner-eyebrow">Partner Request</p>
          <h3>Tell us about your gym</h3>
        </div>

        <form className="gym-partner-form" onSubmit={saveRequest}>
          <label>
            Gym Name
            <input name="gymName" value={form.gymName} onChange={handleChange} placeholder="Your gym name" />
          </label>

          <label>
            Owner / Manager Name
            <input name="ownerName" value={form.ownerName} onChange={handleChange} placeholder="Owner or manager name" />
          </label>

          <label>
            Mobile Number
            <input name="mobile" value={form.mobile} onChange={handleChange} inputMode="tel" maxLength="10" placeholder="10-digit mobile number" />
          </label>

          <label>
            City
            <input name="city" value={form.city} onChange={handleChange} placeholder="City" />
          </label>

          <label>
            Expected Daily Orders
            <input name="expectedDailyOrders" value={form.expectedDailyOrders} onChange={handleChange} inputMode="numeric" placeholder="Example: 40" />
          </label>

          <label className="gym-form-wide">
            Message / Requirements <span style={{ opacity: 0.6 }}>Optional</span>
            <textarea name="message" value={form.message} onChange={handleChange} placeholder="Timing, member count, counter setup, or custom requirements" />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Submitting…" : "Submit Partner Request"}
          </button>
        </form>
      </section>
    </main>
  );
}
