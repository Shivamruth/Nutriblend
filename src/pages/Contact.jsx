import { useState } from "react";
import { useNotification } from "../context/NotificationContext";
import "../styles/gym-partner.css";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const WHATSAPP_NUMBER = "919999999999"; // Replace with actual WhatsApp business number

const FAQ = [
  {
    q: "How long does delivery take?",
    a: "We aim for same-day delivery for orders placed before 12 PM. Subscription plan deliveries follow your selected schedule.",
  },
  {
    q: "Can I change my delivery address?",
    a: "Yes! You can update your delivery address from the Address section in your account before your order is dispatched.",
  },
  {
    q: "What if my payment failed but money was deducted?",
    a: "Please share your order ID and a payment screenshot via WhatsApp. Refunds are processed within 5–7 business days.",
  },
  {
    q: "How do I cancel a subscription plan?",
    a: "Go to My Subscriptions in your account and tap Cancel. You can reach us on WhatsApp for immediate cancellation help.",
  },
  {
    q: "Do you offer gym or bulk pricing?",
    a: "Yes! Visit the Gym Partner page to submit a partnership request and our team will reach out within 48 hours.",
  },
];

const initialForm = { name: "", email: "", subject: "", message: "" };

export default function Contact() {
  const { notify } = useNotification();
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.message) {
      notify("Name, email, and message are required", "error");
      return;
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
    if (!emailOk) {
      notify("Enter a valid email address", "error");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/inquiries/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to submit");
      }

      setForm(initialForm);
      setSubmitted(true);
      notify("Message sent! We'll get back to you soon.", "success");
    } catch (err) {
      console.error("Contact inquiry error:", err);
      notify(err.message || "Could not send message. Try WhatsApp instead.", "error");
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = () => {
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20NutriBlend%20team%2C%20I%20need%20help%20with%20my%20order.`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <main className="gym-partner-page">
      <section className="gym-partner-hero">
        <p className="gym-partner-eyebrow">Support</p>
        <h1>We're Here to Help</h1>
        <p>Reach us for orders, payments, subscriptions, or anything else.</p>
      </section>

      {/* Support channels */}
      <div className="gym-partner-layout" style={{ marginBottom: 0 }}>
        <section className="gym-partner-panel">
          <div className="gym-partner-section-head">
            <p className="gym-partner-eyebrow">Instant Help</p>
            <h3>WhatsApp Support</h3>
          </div>
          <p style={{ marginBottom: 16, color: "var(--text-muted, #94a3b8)" }}>
            The fastest way to get order, delivery, or payment help. Available Mon–Sat, 10 AM–7 PM.
          </p>
          <button
            type="button"
            id="whatsapp-support-btn"
            onClick={openWhatsApp}
            style={{
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 15,
            }}
          >
            <span>📱</span> Chat on WhatsApp
          </button>
          <div className="gym-steps-list" style={{ marginTop: 24 }}>
            {[
              ["Order ID", "Include your order ID for faster resolution"],
              ["Payment Issue", "Attach a payment screenshot if money was deducted"],
              ["Delivery", "Share your registered mobile number"],
            ].map(([label, desc]) => (
              <div className="gym-step" key={label}>
                <span>{label}</span>
                <strong>{desc}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="gym-partner-panel">
          <div className="gym-partner-section-head">
            <p className="gym-partner-eyebrow">FAQ</p>
            <h3>Common Questions</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FAQ.map((item, idx) => (
              <div
                key={item.q}
                style={{
                  padding: "14px 18px",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer",
                }}
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                <p style={{ fontWeight: 600, marginBottom: openFaq === idx ? 10 : 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {item.q}
                  <span style={{ opacity: 0.5, transition: "transform 0.2s", transform: openFaq === idx ? "rotate(180deg)" : "none" }}>▾</span>
                </p>
                {openFaq === idx && (
                  <p style={{ color: "var(--text-muted, #94a3b8)", fontSize: 14, lineHeight: 1.6 }}>{item.a}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Contact form */}
      <section className="gym-partner-form-card">
        <div className="gym-partner-section-head">
          <p className="gym-partner-eyebrow">Message Us</p>
          <h3>{submitted ? "Message Sent!" : "Send Us a Message"}</h3>
        </div>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <p style={{ fontSize: 48 }}>✅</p>
            <p style={{ marginTop: 12, color: "var(--text-muted, #94a3b8)" }}>
              We'll get back to you at <strong>{form.email || "your email"}</strong> within 1–2 business days.
            </p>
            <button type="button" style={{ marginTop: 20 }} onClick={() => setSubmitted(false)}>
              Send Another Message
            </button>
          </div>
        ) : (
          <form className="gym-partner-form" onSubmit={handleSubmit}>
            <label>
              Your Name
              <input id="contact-name" name="name" value={form.name} onChange={handleChange} placeholder="Full name" />
            </label>

            <label>
              Email Address
              <input id="contact-email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="your@email.com" />
            </label>

            <label>
              Subject <span style={{ opacity: 0.6 }}>Optional</span>
              <input id="contact-subject" name="subject" value={form.subject} onChange={handleChange} placeholder="Order issue, refund, subscription…" />
            </label>

            <label className="gym-form-wide">
              Message
              <textarea id="contact-message" name="message" value={form.message} onChange={handleChange} rows={5} placeholder="Describe your issue or question…" />
            </label>

            <button type="submit" id="contact-submit-btn" disabled={loading}>
              {loading ? "Sending…" : "Send Message"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
