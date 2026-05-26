import { useState } from "react";
import { useNotification } from "../context/NotificationContext";
import "../styles/gym-partner.css";

const benefits = [
  "Daily fresh shakes",
  "Pre and post workout combos",
  "Bulk pricing",
  "Custom gym plans",
  "Delivery to gym",
];

const steps = [
  "Gym contacts NutriBlend",
  "We understand daily demand",
  "We set pricing and plans",
  "We deliver daily or set up counter",
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

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextValue =
      name === "mobile" || name === "expectedDailyOrders"
        ? value.replace(/\D/g, "")
        : value;

    setForm((prev) => ({ ...prev, [name]: nextValue }));
  };

  const saveRequest = (event) => {
    event.preventDefault();

    const requiredFields = [
      form.gymName,
      form.ownerName,
      form.mobile,
      form.city,
      form.expectedDailyOrders,
    ];

    if (requiredFields.some((value) => !String(value || "").trim())) {
      notify("Complete all required gym partner fields", "error");
      return;
    }

    if (!/^\d{10}$/.test(form.mobile)) {
      notify("Mobile number must be 10 digits", "error");
      return;
    }

    const savedRequests = JSON.parse(localStorage.getItem("gymPartnerRequests")) || [];
    const request = {
      ...form,
      id: `gym-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem("gymPartnerRequests", JSON.stringify([request, ...savedRequests]));
    setForm(initialForm);
    notify("Gym partner request saved", "success");
  };

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
            Owner Name
            <input name="ownerName" value={form.ownerName} onChange={handleChange} placeholder="Owner or manager name" />
          </label>

          <label>
            Mobile Number
            <input name="mobile" value={form.mobile} onChange={handleChange} inputMode="tel" maxLength="10" placeholder="10 digit mobile number" />
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
            Message
            <textarea name="message" value={form.message} onChange={handleChange} placeholder="Tell us about timing, member count, counter setup, or custom requirements" />
          </label>

          <button type="submit">Submit Partner Request</button>
        </form>
      </section>
    </main>
  );
}
