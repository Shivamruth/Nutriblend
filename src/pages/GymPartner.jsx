import { useState } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";
import "../styles/gym-partner.css";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const benefits = [
  {
    icon: "🥤",
    title: "Daily Fresh Protein Shakes",
    desc: "Cold-pressed, made fresh every morning for maximum nutrition",
  },
  {
    icon: "💪",
    title: "Pre & Post-Workout Combos",
    desc: "Timed nutrition packs designed around training schedules",
  },
  {
    icon: "💰",
    title: "Bulk Member Pricing",
    desc: "Volume discounts that grow with your gym's daily orders",
  },
  {
    icon: "🏷️",
    title: "Custom Gym-Branded Plans",
    desc: "White-label shake menus with your gym's branding",
  },
  {
    icon: "🚚",
    title: "Direct Delivery to Gym",
    desc: "On-time daily delivery or permanent counter setup",
  },
  {
    icon: "📊",
    title: "Nutrition Analytics Dashboard",
    desc: "Track member orders, popular flavors, and monthly consumption",
  },
];

const steps = [
  {
    num: "01",
    title: "Submit Your Details",
    desc: "Fill out the form below with your gym info and requirements",
  },
  {
    num: "02",
    title: "We Understand Your Demand",
    desc: "Our team reviews member count, timing, and daily volume",
  },
  {
    num: "03",
    title: "Custom Pricing & Plans",
    desc: "We design pricing tiers and menus for your gym specifically",
  },
  {
    num: "04",
    title: "Go Live & Deliver",
    desc: "Daily delivery starts or we set up an on-site counter",
  },
];

const stats = [
  { value: "50+", label: "Gym Partners" },
  { value: "2,000+", label: "Daily Shakes" },
  { value: "98%", label: "Retention Rate" },
  { value: "24hr", label: "Setup Time" },
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
        <section className="gym-success-screen">
          <div className="gym-success-glow" />
          <div className="gym-success-icon">
            <svg viewBox="0 0 52 52" fill="none">
              <circle cx="26" cy="26" r="25" stroke="currentColor" strokeWidth="2" opacity="0.2" />
              <path
                d="M14 27l8 8 16-16"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="gym-check-path"
              />
            </svg>
          </div>
          <p className="gym-partner-eyebrow">Request Received</p>
          <h2>Thank You for Partnering! 🤝</h2>
          <p className="gym-success-desc">
            We received your gym partner request. Our team will reach out within
            <strong> 24–48 hours</strong> to discuss your requirements and set up a customized plan.
          </p>
          <button
            type="button"
            className="gym-cta-btn gym-cta-secondary"
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
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="gym-partner-hero">
        <div className="gym-hero-glow" />
        <div className="gym-hero-badge">
          <span>🏋️</span>
          <span>Gym Collaboration</span>
        </div>
        <h1>
          Partner With <span className="gym-hero-accent">NutriBlend</span>
        </h1>
        <p className="gym-hero-subtitle">
          Fresh protein shakes delivered daily to your gym — bulk pricing,
          custom plans, and hassle-free setup.
        </p>
        <a href="#gym-form-section" className="gym-cta-btn">
          Become a Partner →
        </a>
      </section>

      {/* ── Stats Bar ─────────────────────────────────────── */}
      <section className="gym-stats-bar">
        {stats.map((stat, i) => (
          <div className="gym-stat" key={stat.label} style={{ animationDelay: `${i * 0.08}s` }}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </section>

      {/* ── Benefits ──────────────────────────────────────── */}
      <section className="gym-section">
        <div className="gym-section-head">
          <p className="gym-partner-eyebrow">Why Partner?</p>
          <h2>Built for Fitness Businesses</h2>
          <p className="gym-section-desc">
            Everything your gym needs to offer premium nutrition to members
          </p>
        </div>

        <div className="gym-benefits-grid">
          {benefits.map((b, i) => (
            <div
              className="gym-benefit-card"
              key={b.title}
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="gym-benefit-icon">{b.icon}</div>
              <h3>{b.title}</h3>
              <p>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it Works ──────────────────────────────────── */}
      <section className="gym-section">
        <div className="gym-section-head">
          <p className="gym-partner-eyebrow">How It Works</p>
          <h2>Simple 4-Step Setup</h2>
          <p className="gym-section-desc">
            From inquiry to daily delivery in under 48 hours
          </p>
        </div>

        <div className="gym-steps-timeline">
          {steps.map((step, i) => (
            <div
              className="gym-step"
              key={step.num}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="gym-step-number">{step.num}</div>
              <div className="gym-step-content">
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Form ──────────────────────────────────────────── */}
      <section className="gym-form-section" id="gym-form-section">
        <div className="gym-form-card">
          <div className="gym-form-header">
            <div className="gym-form-header-icon">📝</div>
            <div>
              <p className="gym-partner-eyebrow">Partner Request</p>
              <h2>Tell Us About Your Gym</h2>
              <p className="gym-form-header-desc">
                Fill in your details and we'll get back within 24–48 hours
              </p>
            </div>
          </div>

          <form className="gym-partner-form" onSubmit={saveRequest}>
            <label>
              <span className="gym-label-text">Gym Name <span className="gym-required">*</span></span>
              <input
                name="gymName"
                value={form.gymName}
                onChange={handleChange}
                placeholder="e.g. Iron Paradise Fitness"
              />
            </label>

            <label>
              <span className="gym-label-text">Owner / Manager <span className="gym-required">*</span></span>
              <input
                name="ownerName"
                value={form.ownerName}
                onChange={handleChange}
                placeholder="Full name"
              />
            </label>

            <label>
              <span className="gym-label-text">Mobile Number <span className="gym-required">*</span></span>
              <div className="gym-input-prefix-wrap">
                <span className="gym-input-prefix">+91</span>
                <input
                  name="mobile"
                  value={form.mobile}
                  onChange={handleChange}
                  inputMode="tel"
                  maxLength="10"
                  placeholder="10-digit number"
                  className="gym-input-with-prefix"
                />
              </div>
            </label>

            <label>
              <span className="gym-label-text">City <span className="gym-required">*</span></span>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="e.g. Hyderabad"
              />
            </label>

            <label>
              <span className="gym-label-text">Expected Daily Orders <span className="gym-required">*</span></span>
              <input
                name="expectedDailyOrders"
                value={form.expectedDailyOrders}
                onChange={handleChange}
                inputMode="numeric"
                placeholder="e.g. 40"
              />
            </label>

            <label className="gym-form-wide">
              <span className="gym-label-text">
                Message / Requirements <span className="gym-optional">Optional</span>
              </span>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="Tell us about timing, member count, counter setup, custom flavors, or any other requirements…"
              />
            </label>

            <button type="submit" className="gym-cta-btn gym-submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="gym-spinner" />
                  Submitting…
                </>
              ) : (
                "Submit Partner Request →"
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
