import { useNotification } from "../context/NotificationContext";
import "../styles/monthly-plans.css";

const monthlyPlans = [
  {
    id: "monthly-basic",
    name: "Basic Plan",
    quantity: "10 shakes/month",
    bestFor: "Best for students/beginners",
    price: "Price coming soon",
    benefits: [
      "Simple monthly protein routine",
      "Flexible shake selection",
      "Easy entry plan for daily nutrition",
    ],
  },
  {
    id: "monthly-standard",
    name: "Standard Plan",
    quantity: "20 shakes/month",
    bestFor: "Best for regular gym users",
    price: "Price coming soon",
    benefits: [
      "Consistent post-workout support",
      "More servings for active schedules",
      "Ideal balance of value and frequency",
    ],
  },
  {
    id: "monthly-premium",
    name: "Premium Plan",
    quantity: "30 shakes/month",
    bestFor: "Best for serious fitness users",
    price: "Price coming soon",
    benefits: [
      "Daily shake coverage",
      "Built for strict training routines",
      "Priority monthly nutrition planning",
    ],
  },
  {
    id: "monthly-gym-combo",
    name: "Gym Combo Plan",
    quantity: "Pre-workout + Post-workout shake",
    bestFor: "Best for performance and muscle gain",
    price: "Price coming soon",
    benefits: [
      "Energy support before training",
      "Recovery shake after workout",
      "Performance-focused monthly bundle",
    ],
  },
];

export default function MonthlyPlans({ setPage }) {
  const { notify } = useNotification();

  const addToCart = (plan, goToCart = false) => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const planItem = {
      id: plan.id,
      name: plan.name,
      price: 0,
      qty: 1,
      category: "Monthly Subscription",
      protein: plan.quantity,
      description: plan.bestFor,
      isPlan: true,
      priceLabel: plan.price,
    };

    const existingIndex = cart.findIndex((item) => item.id === plan.id);
    const updatedCart =
      existingIndex >= 0
        ? cart.map((item, index) =>
            index === existingIndex
              ? { ...item, qty: Number(item.qty || 1) + 1 }
              : item
          )
        : [...cart, planItem];

    localStorage.setItem("cart", JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("cartUpdated"));
    notify(`${plan.name} added to cart`, "success");

    if (goToCart) setPage?.("cart");
  };

  return (
    <main className="monthly-plans-page">
      <section className="monthly-plans-hero">
        <p className="monthly-plans-eyebrow">Monthly Plans</p>
        <h2>NutriBlend Subscription Plans</h2>
        <p>
          Build consistency with monthly shake plans for students, gym users,
          and performance-focused fitness routines.
        </p>
      </section>

      <section className="monthly-plans-grid" aria-label="Monthly subscription plans">
        {monthlyPlans.map((plan) => (
          <article className="monthly-plan-card" key={plan.id}>
            <div className="monthly-plan-head">
              <span>{plan.quantity}</span>
              <h3>{plan.name}</h3>
              <p>{plan.bestFor}</p>
            </div>

            <ul className="monthly-plan-benefits">
              {plan.benefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>

            <div className="monthly-plan-price">
              <span>Suggested Price</span>
              <strong>{plan.price}</strong>
            </div>

            <div className="monthly-plan-actions">
              <button type="button" onClick={() => addToCart(plan)}>
                Add to Cart
              </button>
              <button type="button" onClick={() => addToCart(plan, true)}>
                Subscribe
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
