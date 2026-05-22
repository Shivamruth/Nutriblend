import { useNotification } from "../context/NotificationContext";
import "../styles/plans.css";

const plans = [
  {
    id: "weekly-natural",
    name: "Weekly Natural Shake Plan",
    badge: "Student Friendly",
    protein: "10g - 15g Protein",
    duration: "6 Days",
    price: 499,
    category: "Subscription",
    image: "🥤",
    bestFor: "Students, hostelers, beginners",
    includes: [
      "1 natural shake per day",
      "Banana / oats / peanut butter base",
      "Budget-friendly daily nutrition",
      "Morning or evening delivery option",
    ],
  },
  {
    id: "weekly-whey",
    name: "Weekly Whey Shake Plan",
    badge: "Most Popular",
    protein: "20g Protein",
    duration: "6 Days",
    price: 699,
    category: "Subscription",
    image: "💪",
    bestFor: "Gym beginners and busy students",
    includes: [
      "1 whey shake per day",
      "20g protein serving",
      "Good for daily protein intake",
      "Suitable for post-workout",
    ],
  },
  {
    id: "monthly-natural",
    name: "Monthly Natural Shake Plan",
    badge: "Budget Plan",
    protein: "10g - 15g Protein",
    duration: "26 Days",
    price: 1899,
    category: "Subscription",
    image: "🌿",
    bestFor: "Regular nutrition and light fitness",
    includes: [
      "26 natural shakes",
      "Affordable monthly plan",
      "Natural ingredients",
      "Good for daily energy",
    ],
  },
  {
    id: "monthly-whey",
    name: "Monthly Whey Shake Plan",
    badge: "Best Value",
    protein: "20g Protein",
    duration: "26 Days",
    price: 2499,
    category: "Subscription",
    image: "🏋️",
    bestFor: "Gym users and protein intake",
    includes: [
      "26 whey shakes",
      "20g protein per shake",
      "Good for muscle recovery",
      "Monthly consistency plan",
    ],
  },
  {
    id: "preworkout-combo",
    name: "Pre-Workout Combo Plan",
    badge: "Energy Boost",
    protein: "Energy + Pump",
    duration: "12 Servings",
    price: 899,
    category: "Subscription",
    image: "⚡",
    bestFor: "Workout energy and gym pump",
    includes: [
      "Coffee based pre-workout",
      "Beetroot / lemon / honey options",
      "Electrolyte support",
      "Best before workout",
    ],
  },
  {
    id: "premium-gym",
    name: "Premium Gym Plan",
    badge: "Premium",
    protein: "30g - 50g Protein",
    duration: "26 Days",
    price: 3499,
    category: "Subscription",
    image: "🔥",
    bestFor: "Serious gym users and bulking",
    includes: [
      "High protein shake plan",
      "30g to 50g protein options",
      "Premium ingredients",
      "Best for bulking and competitions",
    ],
  },
];

export default function Plans({ setPage }) {
  const { notify } = useNotification();

  const addPlanToCart = (e, plan) => {
    e.preventDefault();
    e.stopPropagation();

    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    const planItem = {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      qty: 1,
      category: plan.category,
      protein: plan.protein,
      duration: plan.duration,
      image: plan.image,
      isPlan: true,
    };

    const existingIndex = cart.findIndex((item) => item.id === plan.id);

    let updatedCart;

    if (existingIndex >= 0) {
      updatedCart = cart.map((item, index) =>
        index === existingIndex
          ? { ...item, qty: Number(item.qty || 1) + 1 }
          : item
      );
    } else {
      updatedCart = [...cart, planItem];
    }

    localStorage.setItem("cart", JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("cartUpdated"));

    notify("Added to cart", "success");
    setPage("cart");
  };

  return (
    <div className="plans-page">
      <section className="plans-hero">
        <p className="plans-eyebrow">NutriBlend Plans</p>
        <h2>Weekly & Monthly Shake Plans</h2>
        <p>
          Choose a plan for daily protein, pre-workout energy, or premium gym
          nutrition. Add a plan to cart and continue checkout normally.
        </p>
      </section>

      <div className="plans-grid">
        {plans.map((plan) => (
          <div className="plan-card" key={plan.id}>
            <div className="plan-top">
              <span className="plan-image">{plan.image}</span>
              <span className="plan-badge">{plan.badge}</span>
            </div>

            <h3>{plan.name}</h3>

            <div className="plan-meta">
              <span>{plan.protein}</span>
              <span>{plan.duration}</span>
            </div>

            <p className="plan-best">
              <strong>Best for:</strong> {plan.bestFor}
            </p>

            <ul className="plan-includes">
              {plan.includes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <div className="plan-footer">
              <div>
                <span className="plan-price-label">Plan Price</span>
                <h4>₹{plan.price}</h4>
              </div>

              <button type="button" onClick={(e) => addPlanToCart(e, plan)}>
                Add Plan
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
