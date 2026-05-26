import LegalPage from "./LegalPage";

export default function About() {
  return (
    <LegalPage
      eyebrow="About NutriBlend"
      title="Built for everyday fitness nutrition"
      lead="NutriBlend helps customers order fresh protein shakes, workout combos, subscriptions, and gym-focused nutrition with simple checkout and order tracking."
      sections={[
        { heading: "Who We Serve", items: ["Students and beginners", "Regular gym users", "Serious fitness users", "Gym partners and teams"] },
        { heading: "What We Do", items: ["Fresh shakes and protein options", "Monthly subscription plans", "Delivery tracking", "Gym collaboration support"] },
        { heading: "Our Standard", text: "We focus on practical nutrition, clear ordering, reliable support, and a premium customer experience.", full: true },
      ]}
    />
  );
}
