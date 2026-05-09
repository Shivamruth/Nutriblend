import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";
import { fallbackProductImage, withProductImage } from "../utils/productImages";
import "../styles/home.css";

const subscriptionPlans = [
  {
    id: "weekly-natural-plan",
    name: "Weekly Natural Plan",
    category: "Plans",
    price: 499,
    protein: "10g - 15g",
    duration: "6 Days",
    tag: "Student Friendly",
    image: "🥤",
    description: "Budget natural shake plan for students and hostelers.",
    bestFor: "Students, hostelers, beginners",
    includes: ["6 shakes", "Natural ingredients", "Daily energy", "Budget friendly"],
    isPlan: true,
  },
  {
    id: "weekly-whey-plan",
    name: "Weekly Whey Plan",
    category: "Plans",
    price: 699,
    protein: "20g",
    duration: "6 Days",
    tag: "Most Popular",
    image: "💪",
    description: "Daily whey shake plan for gym beginners.",
    bestFor: "Gym beginners and busy students",
    includes: ["6 whey shakes", "20g protein", "Post-workout support", "Easy protein intake"],
    isPlan: true,
  },
  {
    id: "monthly-natural-plan",
    name: "Monthly Natural Plan",
    category: "Plans",
    price: 1899,
    protein: "10g - 15g",
    duration: "26 Days",
    tag: "Budget Plan",
    image: "🌿",
    description: "Affordable monthly plan for daily nutrition.",
    bestFor: "Regular nutrition and light fitness",
    includes: ["26 shakes", "Natural base", "Daily consistency", "Affordable monthly pack"],
    isPlan: true,
  },
  {
    id: "monthly-whey-plan",
    name: "Monthly Whey Plan",
    category: "Plans",
    price: 2499,
    protein: "20g",
    duration: "26 Days",
    tag: "Best Value",
    image: "🏋️",
    description: "Monthly whey shake plan for fitness users.",
    bestFor: "Gym users and protein intake",
    includes: ["26 whey shakes", "20g protein", "Muscle recovery", "Best value plan"],
    isPlan: true,
  },
  {
    id: "preworkout-combo-plan",
    name: "Pre-Workout Combo",
    category: "Plans",
    price: 899,
    protein: "Energy",
    duration: "12 Servings",
    tag: "Energy Boost",
    image: "⚡",
    description: "Energy combo for workout performance.",
    bestFor: "Workout energy and gym pump",
    includes: ["12 servings", "Coffee energy", "Pump support", "Before workout"],
    isPlan: true,
  },
  {
    id: "premium-gym-plan",
    name: "Premium Gym Plan",
    category: "Plans",
    price: 3499,
    protein: "30g - 50g",
    duration: "26 Days",
    tag: "Premium",
    image: "🔥",
    description: "High-protein premium plan for serious gym users.",
    bestFor: "Bulking and serious gym users",
    includes: ["26 premium shakes", "30g - 50g protein", "Premium ingredients", "Bulking support"],
    isPlan: true,
  },
];

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

export default function Home({ search, setPage, setSelectedProduct }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { notify } = useNotification();
  const [plans, setPlans] = useState([]);
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  async function fetchProducts() {
    setLoading(true);

    const { data, error } = await supabase.from("products").select("*");

    if (error) {
      console.log("ERROR:", error);
      notify("Failed to load products", "error");
    } else {
      setProducts((data || []).map(withProductImage));
    }

    setLoading(false);
  }

  async function fetchPlans() {
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
  }));

  setPlans(formattedPlans);
}

  useEffect(() => {
    fetchProducts();
    fetchPlans();
  }, []);

  const addToCart = (e, item) => {
    e.stopPropagation();

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

    notify(`${item.name} added to cart ✅`, "success");
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setPage("product");
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
        normalize(item.protein).includes(query);

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

    return (
      <div
        key={item.id}
        className={`card horizontal-card ${isPlan ? "plan-home-card" : ""}`}
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
          <img
            src={item.image || fallbackProductImage}
            className="product-img"
            alt={item.name}
            onError={(e) => {
              e.currentTarget.src = fallbackProductImage;
            }}
          />
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
              {!String(item.protein).toLowerCase().includes("g") &&
              !isPlan
                ? "g"
                : ""}
            </span>

            <span className="category">
              {isPlan ? item.duration : item.category}
            </span>
          </div>

          <div className="card-footer">
            <span className="card-price">₹{item.price}</span>

            <button onClick={(e) => addToCart(e, item)}>
              {isPlan ? "Add Plan" : "Add to Cart"}
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
            Fuel Your{" "}
            <span className="home-hero-accent">Fitness</span> Journey
          </h1>
          <p className="home-hero-desc">
            Explore shakes, pre-workout combos, premium protein options, and
            weekly/monthly subscription plans.
          </p>
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
    </div>
  );
}