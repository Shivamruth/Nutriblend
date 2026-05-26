import LegalPage from "./LegalPage";

export default function NutritionDisclaimer() {
  return (
    <LegalPage
      eyebrow="Nutrition"
      title="Nutrition Disclaimer"
      lead="NutriBlend products are general fitness nutrition products and are not medical treatment. Customers with allergies, health conditions, or special dietary needs should consult a professional before consuming."
      sections={[
        { heading: "General Fitness Nutrition", text: "Products are intended for everyday fitness and nutrition support, not diagnosis, treatment, cure, or prevention of any disease." },
        { heading: "Customer Care", items: ["Check ingredients before ordering", "Avoid products that conflict with allergies", "Consult a professional for health conditions or special diets"] },
        { heading: "Responsibility", text: "Customers are responsible for choosing products suitable for their own body, goals, allergies, and dietary restrictions.", full: true },
      ]}
    />
  );
}
