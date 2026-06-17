import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";
import { BUSINESS } from "../config/business";
import { fallbackProductImage, withProductImage } from "../utils/productImages";
import "../styles/home.css";

const categories = [
  {
    key: "All",
    label: "All",
    icon: "🔥",
  },
  {
    key: "Natural",
    label: "Natural Shakes",
    icon: "🌿",
  },
  {
    key: "Whey",
    label: "Whey Shakes",
    icon: "💪",
  },
  {
    key: "Preworkout",
    label: "Pre-Workout",
    icon: "⚡",
  },
  {
    key: "Premium",
    label: "Premium Shakes",
    icon: "👑",
  },
  {
    key: "Plans",
    label: "Subscription Plans",
    icon: "📅",
  },
];

const normalizeStockStatus = (status) => {
  const value = String(status || "In Stock")
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim();

  if (value === "out of stock") return "Out of Stock";
  if (value === "limited stock") return "Limited Stock";

  return "In Stock";
};

const getStockClass = (status) =>
  normalizeStockStatus(status).toLowerCase().replaceAll(" ", "-");

export default function Home({ search, setPage, setSelectedProduct }) {
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { notify } = useNotification();

  const fetchProducts = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.log("PRODUCTS ERROR:", error);
      notify("Failed to load products", "error");
    } else {
      const formattedProducts = (data || []).map((product) =>
        withProductImage({
          ...product,
          is_active: product.is_active !== false,
          stock_status: normalizeStockStatus(product.stock_status),
        })
      );

      setProducts(formattedProducts);
    }

    setLoading(false);
  }, [notify]);

  const fetchPlans = useCallback(async () => {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.log("PLANS ERROR:", error);
      return;
    }

    const formattedPlans = (data || []).map((plan) => ({
      id: plan.id,
      name: plan.name,
      category: "Plans",
      price: plan.price,
      protein: plan.protein,
      duration: plan.duration,
      tag: plan.tag,
      image: plan.image || "📅",
      description: plan.description,
      bestFor: plan.best_for,
      includes: String(plan.includes || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      isPlan: true,
      stock_status: "In Stock",
    }));

    setPlans(formattedPlans);
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchPlans();
  }, [fetchProducts, fetchPlans]);

  const addToCart = (e, item) => {
    e.preventDefault();
    e.stopPropagation();

    const isPlan = item.isPlan;
    const stockStatus = normalizeStockStatus(item.stock_status);
    const isOutOfStock = !isPlan && stockStatus === "Out of Stock";

    if (isOutOfStock) {
      notify("This product is currently out of stock", "error");
      return;
    }

    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const existing = cart.find((cartItem) => cartItem.id === item.id);

    let updatedCart;

    if (existing) {
      updatedCart = cart.map((cartItem) =>
        cartItem.id === item.id
          ? { ...cartItem, qty: Number(cartItem.qty || 1) + 1 }
          : cartItem
      );
    } else {
      updatedCart = [
        ...cart,
        {
          ...item,
          qty: 1,
          product_name: item.name,
          plan_duration: item.duration || null,
          plan_best_for: item.bestFor || null,
          plan_includes: item.includes || [],
        },
      ];
    }

    localStorage.setItem("cart", JSON.stringify(updatedCart));

    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("cartUpdated"));

    const cartIcon = document.getElementById("cart-icon");

    if (cartIcon) {
      cartIcon.classList.add("bump");
      setTimeout(() => cartIcon.classList.remove("bump"), 400);
    }

    notify("Added to cart", "success");
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setPage(`product/${product.id}`);
  };

  const normalize = (value) => String(value || "").toLowerCase();

  const allItems = useMemo(() => {
    return [...products, ...plans];
  }, [products, plans]);

  const filteredItems = useMemo(() => {
    let result = allItems.filter((item) => {
      const matchCategory = filter === "All" || item.category === filter;
      const query = normalize(search);

      const matchSearch =
        normalize(item.name).includes(query) ||
        normalize(item.category).includes(query) ||
        normalize(item.description).includes(query) ||
        normalize(item.protein).includes(query) ||
        normalize(item.stock_status).includes(query);

      return matchCategory && matchSearch;
    });

    if (sort === "priceLow") {
      result = [...result].sort((a, b) => Number(a.price) - Number(b.price));
    }

    if (sort === "priceHigh") {
      result = [...result].sort((a, b) => Number(b.price) - Number(a.price));
    }

    if (sort === "protein") {
      result = [...result].sort(
        (a, b) => parseFloat(b.protein) - parseFloat(a.protein)
      );
    }

    return result;
  }, [allItems, filter, search, sort]);

  const getCategoryItems = (categoryKey) => {
    return filteredItems.filter((item) => item.category === categoryKey);
  };

  const visibleSections =
    filter === "All"
      ? categories.filter((cat) => cat.key !== "All")
      : categories.filter((cat) => cat.key === filter);

  const totalResults = filteredItems.length;

  const renderCard = (item, index) => {
    const isPlan = item.isPlan;
    const stockStatus = normalizeStockStatus(item.stock_status);
    const isOutOfStock = !isPlan && stockStatus === "Out of Stock";

    return (
      <div
        key={item.id}
        className={`card horizontal-card ${isPlan ? "plan-home-card" : ""} ${
          isOutOfStock ? "home-out-of-stock-card" : ""
        }`}
        style={{ animationDelay: `${index * 0.04}s` }}
        onClick={() => handleProductClick(item)}
      >
        {item.tag && <div className="card-tag">{item.tag}</div>}

        {isPlan ? (
          <div className="plan-premium-top">
            <div className="plan-emoji-box">{item.image}</div>
            <div className="plan-duration-pill">{item.duration}</div>
          </div>
        ) : (
          <div className="home-product-image-wrap">
            <img
              src={item.image || fallbackProductImage}
              className="product-img"
              alt={item.name}
              loading="lazy"
              decoding="async"
              width="800"
              height="800"
              onError={(e) => {
                e.currentTarget.src = fallbackProductImage;
              }}
            />

            {stockStatus !== "In Stock" && (
  <div className={`home-stock-badge ${getStockClass(stockStatus)}`}>
    {stockStatus}
  </div>
)}

            {isOutOfStock && (
              <div className="home-out-of-stock-overlay">
                <span>Currently Unavailable</span>
              </div>
            )}
          </div>
        )}

        <div className="card-body">
          <h3>{item.name}</h3>

          <p className="home-card-desc">{item.description}</p>

          {isPlan && (
            <>
              <p className="plan-best-for">
                Best for: <span>{item.bestFor}</span>
              </p>

              <div className="plan-mini-list">
                {item.includes?.slice(0, 4).map((point) => (
                  <span key={point}>✓ {point}</span>
                ))}
              </div>
            </>
          )}

          <div className="card-meta">
            <span className="protein">
              💪 {item.protein}
              {!String(item.protein).toLowerCase().includes("g") && !isPlan
                ? "g"
                : ""}
            </span>

            <span className="category">
              {isPlan ? item.duration : item.category}
            </span>
          </div>

          <div className="card-footer">
            <span className="card-price">₹{item.price}</span>

            <button
              type="button"
              onClick={(e) => addToCart(e, item)}
              disabled={isOutOfStock}
              className={isOutOfStock ? "home-stock-disabled-btn" : ""}
            >
              {isOutOfStock
                ? "Out of Stock"
                : isPlan
                ? "Add Plan"
                : "Add to Cart"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="home-container">
      <div className="home-hero">
        <div className="home-hero-content">
          <p className="home-hero-eyebrow">Premium Nutrition</p>
          <h1>
            Fuel Your <span className="home-hero-accent">Fitness</span> Journey
          </h1>
          <p className="home-hero-desc">
            Explore shakes, pre-workout combos, premium protein options, and
            weekly/monthly subscription plans.
          </p>
        </div>

        <div className="home-hero-actions">
          <div className="home-brand-orbit">
            <img
              src="/nutriblend-logo.svg"
              alt="NutriBlend"
              decoding="async"
              fetchPriority="high"
              width="96"
              height="96"
            />
          </div>

          <button
            className="filter-icon"
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Toggle filters"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 5H3" />
              <path d="M12 19H3" />
              <path d="M14 3v4" />
              <path d="M16 17v4" />
              <path d="M21 12h-9" />
              <path d="M21 19h-5" />
              <path d="M21 5h-7" />
              <path d="M8 10v4" />
              <path d="M8 12H3" />
            </svg>
          </button>
        </div>
      </div>

      <div className="home-service-area-banner">
        <span className="home-service-pin">📍</span>
        <div>
          <strong>Delivering in {BUSINESS.serviceArea}</strong>
          <span>Expanding across Hyderabad soon — stay tuned!</span>
        </div>
      </div>

      <div className="home-category-bar">
        {categories.map((cat) => (
          <button
            key={cat.key}
            className={`home-chip ${
              filter === cat.key ? "home-chip-active" : ""
            }`}
            onClick={() => setFilter(cat.key)}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="home-sort-bar">
        <span className="home-results-count">
          {totalResults} item{totalResults !== 1 ? "s" : ""}
        </span>

        <div className="home-sort-options">
          <button
            className={`home-sort-btn ${sort === "priceLow" ? "active" : ""}`}
            onClick={() => setSort(sort === "priceLow" ? "" : "priceLow")}
          >
            ₹ Low → High
          </button>

          <button
            className={`home-sort-btn ${sort === "priceHigh" ? "active" : ""}`}
            onClick={() => setSort(sort === "priceHigh" ? "" : "priceHigh")}
          >
            ₹ High → Low
          </button>

          <button
            className={`home-sort-btn ${sort === "protein" ? "active" : ""}`}
            onClick={() => setSort(sort === "protein" ? "" : "protein")}
          >
            💪 Protein
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="filter-panel">
          <div className="filter-group">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => {
                  setFilter(cat.key);
                  setShowFilters(false);
                }}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          <div className="filter-group">
            <button
              onClick={() => {
                setSort("priceLow");
                setShowFilters(false);
              }}
            >
              ₹ Low → High
            </button>

            <button
              onClick={() => {
                setSort("priceHigh");
                setShowFilters(false);
              }}
            >
              ₹ High → Low
            </button>

            <button
              onClick={() => {
                setSort("protein");
                setShowFilters(false);
              }}
            >
              💪 Protein
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="home-loading">
          <div className="home-horizontal-row">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="home-skeleton-card horizontal-card">
                <div className="home-skeleton-img loading" />
                <div className="home-skeleton-text loading" />
                <div className="home-skeleton-text-sm loading" />
                <div className="home-skeleton-btn loading" />
              </div>
            ))}
          </div>
        </div>
      ) : totalResults === 0 ? (
        <div className="home-empty">
          <span className="home-empty-icon">🔍</span>
          <h3>No items found</h3>
          <p>Try adjusting your filters or search query</p>
          <button
            onClick={() => {
              setFilter("All");
              setSort("");
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="home-sections">
          {visibleSections.map((section) => {
            const sectionItems = getCategoryItems(section.key);

            if (sectionItems.length === 0) return null;

            return (
              <section className="home-category-section" key={section.key}>
                <div className="home-section-header">
                  <div>
                    <p>{section.icon} Category</p>
                    <h2>{section.label}</h2>
                  </div>

                  <button onClick={() => setFilter(section.key)}>
                    View All
                  </button>
                </div>

                <div className="home-horizontal-row">
                  {sectionItems.map((item, index) => renderCard(item, index))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <section className="home-trust-section">
        <div className="home-trust-header">
          <p>Why Choose NutriBlend?</p>
          <h2>Built for fitness customers who want fresh, simple nutrition</h2>
        </div>

        <div className="home-trust-grid">
          <article>
            <h3>Fresh Daily</h3>
            <p>Protein shakes, pre-workout combos, and monthly plans made for practical fitness routines.</p>
          </article>
          <article>
            <h3>Easy Tracking</h3>
            <p>Order progress, delivery status, and live delivery updates are available from your orders.</p>
          </article>
          <article>
            <h3>Gym Ready</h3>
            <p>Bulk pricing, gym collaboration, and custom member plans help NutriBlend work beyond individual orders.</p>
          </article>
        </div>
      </section>

      <section className="home-trust-section">
        <div className="home-trust-header">
          <p>Customer Reviews</p>
          <h2>What early customers like</h2>
        </div>

        <div className="home-review-grid">
          {[
            ["Perfect after workout", "Fresh taste and simple ordering make it easy to keep protein consistent."],
            ["Good for hostel life", "Monthly shakes are useful when cooking or meal prep is hard."],
            ["Gym-friendly idea", "The combo plans make sense for members who train every day."],
          ].map(([title, text]) => (
            <article key={title}>
              <strong>{title}</strong>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-promise-support">
        <article>
          <p>Nutrition Promise</p>
          <h2>General fitness nutrition, clearly presented</h2>
          <span>NutriBlend focuses on everyday fitness products, transparent choices, and customer responsibility around allergies and dietary needs.</span>
        </article>

        <article>
          <p>WhatsApp Support</p>
          <h2>Help when an order needs attention</h2>
          <span>Reach support for delivery, payment, subscription, refund, or gym collaboration questions.</span>
        </article>
      </section>
    </div>
  );
}
