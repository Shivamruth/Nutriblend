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
    tag: null,
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
    tag: "Most Popular",
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
    tag: null,
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
    tag: "Best Value",
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
  tag: plan.tag || null,
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

const STATUS_ICONS = {
  active: "✓",
  cancelled: "✕",
  expired: "—",
};

const trustFeatures = [
  { icon: "🚴", label: "Daily Delivery", desc: "Fresh to your door every morning" },
  { icon: "🔄", label: "Flexible Cancel", desc: "Cancel anytime from your dashboard" },
  { icon: "🥛", label: "Fresh Ingredients", desc: "No preservatives, made fresh daily" },
  { icon: "📞", label: "WhatsApp Support", desc: "Help whenever you need it" },
];

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
  const displayPlans = loadingCatalog ? DEFAULT_MONTHLY_PLANS : catalogPlans;

  return (
    <main className="mp-page">
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="mp-hero">
        <div className="mp-hero-glow" />
        <div className="mp-hero-badge">
          <span>📅</span>
          <span>Monthly Subscription</span>
        </div>
        <h1>
          Build <span className="mp-hero-accent">Consistency</span> With Monthly Plans
        </h1>
        <p className="mp-hero-subtitle">
          Fresh protein shakes delivered daily — designed for students, gym users,
          and serious fitness routines.
        </p>
        <div className="mp-hero-stats">
          {[
            { val: "10–30", unit: "Shakes/Mo" },
            { val: "Fresh", unit: "Daily Made" },
            { val: "Cancel", unit: "Anytime" },
          ].map((s) => (
            <div key={s.unit} className="mp-hero-stat">
              <strong>{s.val}</strong>
              <span>{s.unit}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── My Subscriptions ──────────────────────────────── */}
      {userId && (
        <section className="mp-subs-section">
          <div className="mp-subs-header">
            <div>
              <p className="mp-eyebrow">My Account</p>
              <h2 className="mp-subs-title">
                My Subscriptions
                {activeCount > 0 && (
                  <span className="mp-active-badge">
                    <span className="mp-active-dot" />
                    {activeCount} Active
                  </span>
                )}
              </h2>
            </div>
            {subscriptions.length > 0 && (
              <button
                type="button"
                className="mp-refresh-btn"
                onClick={() => loadSubscriptions(userId)}
                disabled={loadingSubs}
              >
                {loadingSubs ? "Loading…" : "⟳ Refresh"}
              </button>
            )}
          </div>

          {loadingSubs ? (
            <div className="mp-subs-loading">
              {[1, 2].map((n) => (
                <div key={n} className="mp-sub-skeleton loading" />
              ))}
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="mp-empty-subs">
              <div className="mp-empty-icon">📋</div>
              <h3>No active subscriptions</h3>
              <p>
                Subscribe to a plan below. Your subscriptions will appear here after order confirmation.
              </p>
            </div>
          ) : (
            <div className="mp-subs-list">
              {subscriptions.map((sub) => {
                const colors = STATUS_COLORS[sub.status] || STATUS_COLORS.expired;
                const icon = STATUS_ICONS[sub.status] || "—";
                return (
                  <article key={sub.id} className="mp-sub-card">
                    <div className="mp-sub-top">
                      <div className="mp-sub-info">
                        <h4 className="mp-sub-name">{sub.plan_name || "Monthly Plan"}</h4>
                        {sub.plan_protein && (
                          <p className="mp-sub-protein">{sub.plan_protein}</p>
                        )}
                        <div className="mp-sub-dates">
                          <span>📅 Start: {formatDate(sub.start_date)}</span>
                          {sub.end_date && <span> · End: {formatDate(sub.end_date)}</span>}
                          {sub.cancelled_at && <span> · Cancelled: {formatDate(sub.cancelled_at)}</span>}
                        </div>
                      </div>
                      <span
                        className="mp-sub-status"
                        style={{ background: colors.bg, color: colors.color }}
                      >
                        {icon} {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </span>
                    </div>

                    {sub.status === "active" && (
                      <div className="mp-sub-actions">
                        <button
                          type="button"
                          className="mp-btn-cancel"
                          onClick={() => setCancelTargetId(sub.id)}
                          disabled={cancellingId === sub.id}
                        >
                          {cancellingId === sub.id ? "Cancelling…" : "Cancel Subscription"}
                        </button>
                        {sub.order_id && (
                          <button
                            type="button"
                            className="mp-btn-view-order"
                            onClick={() => setPage?.("orders")}
                          >
                            View Order →
                          </button>
                        )}
                      </div>
                    )}

                    {sub.cancel_reason && (
                      <p className="mp-cancel-reason">
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

      {/* ── Plan Catalog ──────────────────────────────────── */}
      <section className="mp-catalog">
        <div className="mp-catalog-head">
          <p className="mp-eyebrow">Plans</p>
          <h2>Choose Your Plan</h2>
          <p className="mp-catalog-desc">
            Pick the plan that fits your fitness routine. Upgrade or cancel anytime.
          </p>
        </div>

        <div className="mp-plans-grid" aria-label="Monthly subscription plans">
          {displayPlans.map((plan, i) => (
            <article
              className={`mp-plan-card ${plan.tag ? "mp-plan-featured" : ""}`}
              key={plan.id}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              {plan.tag && <div className="mp-plan-tag">{plan.tag}</div>}

              <div className="mp-plan-header">
                <div className="mp-plan-emoji">{plan.emoji}</div>
                <div className="mp-plan-qty-pill">{plan.quantity}</div>
                <h3>{plan.name}</h3>
                <p className="mp-plan-for">{plan.bestFor}</p>
              </div>

              <ul className="mp-plan-benefits">
                {plan.benefits.map((benefit) => (
                  <li key={benefit}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="8" fill="currentColor" opacity="0.12" />
                      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {benefit}
                  </li>
                ))}
              </ul>

              <div className="mp-plan-price-block">
                <span className="mp-plan-price-label">Monthly Price</span>
                <strong className="mp-plan-price">{plan.price}</strong>
              </div>

              <div className="mp-plan-actions">
                <button
                  type="button"
                  className="mp-btn-cart"
                  onClick={() => addToCart(plan)}
                >
                  Add to Cart
                </button>
                <button
                  type="button"
                  className="mp-btn-subscribe"
                  onClick={() => addToCart(plan, true)}
                >
                  Subscribe Now →
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Trust Section ─────────────────────────────────── */}
      <section className="mp-trust">
        <div className="mp-trust-header">
          <p className="mp-eyebrow">Why Subscribe?</p>
          <h2>Built for Your Fitness Lifestyle</h2>
        </div>
        <div className="mp-trust-grid">
          {trustFeatures.map((item, i) => (
            <div
              key={item.label}
              className="mp-trust-card"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="mp-trust-icon">{item.icon}</div>
              <strong>{item.label}</strong>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
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
