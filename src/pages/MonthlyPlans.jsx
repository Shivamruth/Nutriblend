import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";
import ConfirmModal from "../components/ConfirmModal";
import "../styles/monthly-plans.css";

const DEFAULT_MONTHLY_PLANS = [
  {
    id: "monthly-basic",
    name: "Basic Plan",
    quantity: "10 shakes/month",
    bestFor: "Best for students & beginners",
    price: "Price coming soon",
    emoji: "🌱",
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
    emoji: "💪",
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
    emoji: "🔥",
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
    emoji: "⚡",
    benefits: [
      "Energy support before training",
      "Recovery shake after workout",
      "Performance-focused monthly bundle",
    ],
  },
];

const formatDbMonthlyPlan = (plan) => ({
  id: plan.id,
  name: plan.name,
  quantity: plan.duration || "Monthly Plan",
  bestFor: plan.best_for || plan.description || "",
  price: plan.price ? `₹${plan.price}` : "Price coming soon",
  emoji: plan.image || "📅",
  benefits: Array.isArray(plan.includes)
    ? plan.includes
    : typeof plan.includes === "string"
    ? plan.includes.split(",").map(i => i.trim()).filter(Boolean)
    : [],
});

const formatDate = (ts) => {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const STATUS_COLORS = {
  active:    { bg: "rgba(132,204,22,0.12)", color: "#84cc16" },
  cancelled: { bg: "rgba(239,68,68,0.12)",  color: "#ef4444" },
  expired:   { bg: "rgba(100,116,139,0.12)", color: "#64748b" },
};

export default function MonthlyPlans({ setPage }) {
  const { notify } = useNotification();
  const [subscriptions, setSubscriptions]   = useState([]);
  const [loadingSubs, setLoadingSubs]       = useState(true);
  const [cancellingId, setCancellingId]     = useState(null);
  const [userId, setUserId]                 = useState(null);
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [catalogPlans, setCatalogPlans]     = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // ── Load subscriptions ──────────────────────────────────────────────
  const loadSubscriptions = useCallback(async (uid) => {
    setLoadingSubs(true);
    const { data, error } = await supabase
      .from("monthly_subscriptions")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (!error) setSubscriptions(data || []);
    setLoadingSubs(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data?.user?.id;
      if (uid) {
        setUserId(uid);
        loadSubscriptions(uid);
      } else {
        setLoadingSubs(false);
      }
    });
  }, [loadSubscriptions]);

  useEffect(() => {
    const fetchCatalog = async () => {
      setLoadingCatalog(true);
      try {
        const { data, error } = await supabase
          .from("plans")
          .select("*")
          .eq("is_active", true);

        if (error) throw error;

        // Filter plans for monthly duration/categories
        const dbMonthly = (data || []).filter(plan =>
          String(plan.name).toLowerCase().includes("monthly") ||
          String(plan.duration).toLowerCase().includes("30") ||
          String(plan.duration).toLowerCase().includes("26") ||
          String(plan.category).toLowerCase().includes("monthly")
        );

        if (dbMonthly.length > 0) {
          setCatalogPlans(dbMonthly.map(formatDbMonthlyPlan));
        } else {
          setCatalogPlans(DEFAULT_MONTHLY_PLANS);
        }
      } catch (err) {
        console.error("Fetch monthly catalog error:", err);
        setCatalogPlans(DEFAULT_MONTHLY_PLANS);
      } finally {
        setLoadingCatalog(false);
      }
    };
    fetchCatalog();
  }, []);

  // ── Cancel subscription ─────────────────────────────────────────────
  const confirmCancelSubscription = async () => {
    if (!cancelTargetId) return;
    const subId = cancelTargetId;
    setCancelTargetId(null);
    setCancellingId(subId);
    const { error } = await supabase
      .from("monthly_subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", subId)
      .eq("user_id", userId);

    if (error) {
      notify("Could not cancel subscription", "error");
    } else {
      notify("Subscription cancelled", "success");
      await loadSubscriptions(userId);
    }
    setCancellingId(null);
  };

  // ── Add to cart ─────────────────────────────────────────────────────
  const addToCart = (plan, goToCart = false) => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    
    let numericPrice = 0;
    if (typeof plan.price === "number") {
      numericPrice = plan.price;
    } else if (typeof plan.price === "string") {
      const match = plan.price.match(/\d+/);
      if (match) numericPrice = parseInt(match[0], 10);
    }

    const planItem = {
      id: plan.id,
      name: plan.name,
      price: numericPrice,
      qty: 1,
      category: "Monthly Subscription",
      protein: plan.quantity,
      description: plan.bestFor,
      isPlan: true,
      priceLabel: typeof plan.price === "number" ? `₹${plan.price}` : plan.price,
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

  const activeCount = subscriptions.filter((s) => s.status === "active").length;

  return (
    <main className="monthly-plans-page">
      <section className="monthly-plans-hero">
        <p className="monthly-plans-eyebrow">Monthly Plans</p>
        <h1>NutriBlend Subscription Plans</h1>
        <p>
          Build consistency with monthly shake plans for students, gym users,
          and performance-focused fitness routines.
        </p>
      </section>

      {/* ── My Subscriptions ──────────────────────────────────── */}
      {userId && (
        <section className="monthly-plans-subs-section">
          <div className="monthly-plans-subs-head">
            <div>
              <p className="monthly-plans-eyebrow">My Account</p>
              <h2>
                My Subscriptions
                {activeCount > 0 && (
                  <span className="monthly-plans-active-badge">{activeCount} Active</span>
                )}
              </h2>
            </div>
            {subscriptions.length > 0 && (
              <button
                type="button"
                className="monthly-plans-refresh-btn"
                onClick={() => loadSubscriptions(userId)}
                disabled={loadingSubs}
              >
                {loadingSubs ? "Loading…" : "⟳ Refresh"}
              </button>
            )}
          </div>

          {loadingSubs ? (
            <div className="monthly-plans-subs-loading">
              {[1, 2].map((n) => (
                <div key={n} className="monthly-plan-sub-skeleton" />
              ))}
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="monthly-plans-no-subs">
              <p style={{ fontSize: 36 }}>📋</p>
              <p style={{ fontWeight: 700, marginTop: 8 }}>No active subscriptions</p>
              <p style={{ color: "var(--text-muted, #94a3b8)", fontSize: 14, marginTop: 6 }}>
                Subscribe to a plan below. Your subscriptions will appear here after your order is confirmed.
              </p>
            </div>
          ) : (
            <div className="monthly-plans-subs-list">
              {subscriptions.map((sub) => {
                const colors = STATUS_COLORS[sub.status] || STATUS_COLORS.expired;
                return (
                  <article key={sub.id} className="monthly-plan-sub-card">
                    <div className="monthly-plan-sub-top">
                      <div>
                        <p className="monthly-plan-sub-name">{sub.plan_name || "Monthly Plan"}</p>
                        {sub.plan_protein && (
                          <p className="monthly-plan-sub-meta">{sub.plan_protein}</p>
                        )}
                        <div className="monthly-plan-sub-dates">
                          <span>Start: {formatDate(sub.start_date)}</span>
                          {sub.end_date && <span> · End: {formatDate(sub.end_date)}</span>}
                          {sub.cancelled_at && <span> · Cancelled: {formatDate(sub.cancelled_at)}</span>}
                        </div>
                      </div>
                      <span
                        className="monthly-plan-sub-status"
                        style={{ background: colors.bg, color: colors.color }}
                      >
                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </span>
                    </div>

                    {sub.status === "active" && (
                      <div className="monthly-plan-sub-actions">
                        <button
                          type="button"
                          className="monthly-plan-cancel-btn"
                          onClick={() => setCancelTargetId(sub.id)}
                          disabled={cancellingId === sub.id}
                        >
                          {cancellingId === sub.id ? "Cancelling…" : "Cancel Subscription"}
                        </button>
                        {sub.order_id && (
                          <button
                            type="button"
                            className="monthly-plan-orders-btn"
                            onClick={() => setPage?.("orders")}
                          >
                            View Order →
                          </button>
                        )}
                      </div>
                    )}

                    {sub.cancel_reason && (
                      <p className="monthly-plan-cancel-reason">
                        Reason: {sub.cancel_reason}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Plan Catalog ─────────────────────────────────────── */}
      <section className="monthly-plans-catalog">
        <div className="monthly-plans-catalog-head">
          <p className="monthly-plans-eyebrow">Plans</p>
          <h2>Choose Your Plan</h2>
        </div>

        <div className="monthly-plans-grid" aria-label="Monthly subscription plans">
          {(loadingCatalog ? DEFAULT_MONTHLY_PLANS : catalogPlans).map((plan) => (
            <article className="monthly-plan-card" key={plan.id}>
              <div className="monthly-plan-head">
                <span className="monthly-plan-emoji">{plan.emoji}</span>
                <span className="monthly-plan-qty">{plan.quantity}</span>
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
                  Subscribe Now
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Trust section ─────────────────────────────────────── */}
      <section className="monthly-plans-trust">
        {[
          { icon: "🚴", label: "Daily Delivery", desc: "Fresh to your door every morning" },
          { icon: "🔄", label: "Flexible Cancellation", desc: "Cancel anytime from My Subscriptions" },
          { icon: "🥛", label: "Fresh Ingredients", desc: "No preservatives, made fresh daily" },
          { icon: "📞", label: "24/7 WhatsApp Support", desc: "Help whenever you need it" },
        ].map((item) => (
          <div key={item.label} className="monthly-plans-trust-card">
            <span>{item.icon}</span>
            <strong>{item.label}</strong>
            <p>{item.desc}</p>
          </div>
        ))}
      </section>

      <ConfirmModal
        open={!!cancelTargetId}
        title="Cancel Subscription?"
        message="Are you sure you want to cancel this subscription? This will stop daily deliveries."
        confirmText="Cancel"
        cancelText="Keep"
        danger
        onCancel={() => setCancelTargetId(null)}
        onConfirm={confirmCancelSubscription}
      />
    </main>
  );
}
