import LegalPage from "./LegalPage";

export default function PrivacyPolicy() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      lead="NutriBlend uses customer information only to run accounts, orders, delivery, payments, support, and tracking."
      sections={[
        { heading: "Data We Use", items: ["Name, email, and phone", "Delivery addresses and coordinates when added", "Order and payment references", "Support messages"] },
        { heading: "Why We Use It", items: ["To process orders", "To deliver to the correct address", "To provide support", "To improve service reliability"] },
        { heading: "Payment Safety", text: "Online payments are handled by payment providers. NutriBlend does not store full card details.", full: true },
      ]}
    />
  );
}
