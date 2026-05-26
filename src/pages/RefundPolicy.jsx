import LegalPage from "./LegalPage";

export default function RefundPolicy() {
  return (
    <LegalPage
      eyebrow="Refunds"
      title="Refund Policy"
      lead="NutriBlend reviews refunds based on order status, payment method, product condition, and support verification."
      sections={[
        { heading: "Eligible Cases", items: ["Wrong item delivered", "Damaged or leaked packaging", "Expired product", "Verified quality issue"] },
        { heading: "Refund Mode", items: ["Online refunds may follow payment provider timelines", "COD refunds may use wallet credit or another supported method", "Approved refunds are processed after review"] },
        { heading: "Important", text: "Opened consumable products may not be returnable unless there is a verified quality issue.", full: true },
      ]}
    />
  );
}
