import LegalPage from "./LegalPage";

export default function TermsConditions() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms & Conditions"
      lead="These terms explain the basic rules for using NutriBlend, placing orders, and managing account activity."
      sections={[
        { heading: "Customer Responsibility", items: ["Keep account and delivery details accurate", "Review products before placing orders", "Do not misuse coupons or offers"] },
        { heading: "Orders", items: ["Orders depend on availability", "NutriBlend may cancel unavailable or suspicious orders", "Final payable amount is shown at checkout"] },
        { heading: "Policies", text: "Refunds, delivery, nutrition suitability, and promotions follow their respective policy pages.", full: true },
      ]}
    />
  );
}
