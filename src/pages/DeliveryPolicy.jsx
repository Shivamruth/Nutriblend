import LegalPage from "./LegalPage";

export default function DeliveryPolicy() {
  return (
    <LegalPage
      eyebrow="Delivery"
      title="Delivery Policy"
      lead="NutriBlend delivery depends on address accuracy, product availability, order confirmation, and delivery coverage."
      sections={[
        { heading: "Delivery Flow", items: ["Select or save a delivery address", "Place order and complete payment or COD confirmation", "Track progress from Orders", "Keep your phone reachable"] },
        { heading: "Tracking", items: ["Kitchen and customer location may show when coordinates are available", "Delivery partner live location appears when shared", "Manual refresh is available as a fallback"] },
        { heading: "Delivery Issues", text: "For wrong address, missed delivery, or damaged parcel, contact support with your order ID.", full: true },
      ]}
    />
  );
}
