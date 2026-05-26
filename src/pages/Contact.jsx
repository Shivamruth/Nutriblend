import LegalPage from "./LegalPage";

export default function Contact() {
  return (
    <LegalPage
      eyebrow="Contact"
      title="We are here to help"
      lead="Contact NutriBlend for order help, gym partnerships, delivery questions, subscriptions, and product support."
      sections={[
        { heading: "WhatsApp Support", text: "Use WhatsApp for quick order and delivery support during business hours." },
        { heading: "Support Hours", text: "10:00 AM to 7:00 PM, Monday to Saturday." },
        { heading: "What To Share", items: ["Order ID if available", "Registered mobile number", "Delivery address issue", "Payment screenshot if payment failed"], full: true },
      ]}
    />
  );
}
