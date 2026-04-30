import { useEffect, useState } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";

export default function Home({ search, setPage, setSelectedProduct }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { notify } = useNotification();

  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*");

    if (error) {
      console.log("ERROR:", error);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  }

  // 🛒 ADD TO CART
  function addToCart(e, product) {
    e.stopPropagation(); // Prevent card click
    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    const existing = cart.find((i) => i.id === product.id);

    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ ...product, qty: 1 });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("storage")); // Notify App.jsx

    // Fly-to-cart animation
    const cartIcon = document.getElementById("cart-icon");
    if (cartIcon) {
      cartIcon.classList.add("bump");
      setTimeout(() => cartIcon.classList.remove("bump"), 400);
    }

    notify("Added to cart ✅", "success");
  }

  // 🔍 FILTER + SEARCH
  let filtered = products.filter((p) => {
    const matchCategory =
      filter === "All" || p.category === filter;

    const matchSearch = p.name
      ?.toLowerCase()
      .includes((search || "").toLowerCase());

    return matchCategory && matchSearch;
  });

  // 🔥 SORT (SAFE COPY)
  if (sort === "priceLow") {
    filtered = [...filtered].sort((a, b) => a.price - b.price);
  }
  if (sort === "priceHigh") {
    filtered = [...filtered].sort((a, b) => b.price - a.price);
  }
  if (sort === "protein") {
    filtered = [...filtered].sort((a, b) => b.protein - a.protein);
  }

  const categories = [
    { key: "All", label: "All", icon: "🔥" },
    { key: "Natural", label: "Natural", icon: "🌿" },
    { key: "Whey", label: "Whey", icon: "💪" },
    { key: "Pre", label: "Pre-Workout", icon: "⚡" },
    { key: "Premium", label: "Premium", icon: "👑" },
  ];

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setPage("product");
  };

  return (
    <div className="home-container">

      {/* HERO SECTION */}
      <div className="home-hero">
        <div className="home-hero-content">
          <p className="home-hero-eyebrow">Premium Nutrition</p>
          <h1>Fuel Your <span className="home-hero-accent">Fitness</span> Journey</h1>
          <p className="home-hero-desc">
            High-quality protein shakes and supplements crafted for performance.
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
            <path d="M10 5H3"/>
            <path d="M12 19H3"/>
            <path d="M14 3v4"/>
            <path d="M16 17v4"/>
            <path d="M21 12h-9"/>
            <path d="M21 19h-5"/>
            <path d="M21 5h-7"/>
            <path d="M8 10v4"/>
            <path d="M8 12H3"/>
          </svg>
        </button>
      </div>

      {/* CATEGORY CHIPS */}
      <div className="home-category-bar">
        {categories.map((cat) => (
          <button
            key={cat.key}
            className={`home-chip ${filter === cat.key ? "home-chip-active" : ""}`}
            onClick={() => setFilter(cat.key)}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* SORT BAR */}
      <div className="home-sort-bar">
        <span className="home-results-count">
          {filtered.length} product{filtered.length !== 1 ? "s" : ""}
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

      {/* FILTER PANEL (dropdown) */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-group">
            <button onClick={() => { setFilter("All"); setShowFilters(false); }}>All</button>
            <button onClick={() => { setFilter("Natural"); setShowFilters(false); }}>🌿 Natural</button>
            <button onClick={() => { setFilter("Whey"); setShowFilters(false); }}>💪 Whey</button>
            <button onClick={() => { setFilter("Pre"); setShowFilters(false); }}>⚡ Pre-Workout</button>
          </div>

          <div className="filter-group">
            <button onClick={() => { setSort("priceLow"); setShowFilters(false); }}>₹ Low → High</button>
            <button onClick={() => { setSort("priceHigh"); setShowFilters(false); }}>₹ High → Low</button>
            <button onClick={() => { setSort("protein"); setShowFilters(false); }}>💪 Protein</button>
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {loading ? (
        <div className="home-loading">
          <div className="grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="home-skeleton-card">
                <div className="home-skeleton-img loading" />
                <div className="home-skeleton-text loading" />
                <div className="home-skeleton-text-sm loading" />
                <div className="home-skeleton-btn loading" />
              </div>
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="home-empty">
          <span className="home-empty-icon">🔍</span>
          <h3>No products found</h3>
          <p>Try adjusting your filters or search query</p>
          <button onClick={() => { setFilter("All"); setSort(""); }}>
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid">
          {filtered.map((p, index) => (
            <div
              key={p.id}
              className="card"
              style={{ animationDelay: `${index * 0.06}s`, cursor: "pointer" }}
              onClick={() => handleProductClick(p)}
            >
              {/* Tag */}
              {p.tag && <div className="card-tag">{p.tag}</div>}

              <img
                src={p.image}
                className="product-img"
                alt={p.name}
                onError={(e) =>
                  (e.target.src =
                    "https://via.placeholder.com/300x200/0c1a30/7cff6b?text=NutriBlend")
                }
              />

              <div className="card-body">
                <h3>{p.name}</h3>

                <div className="card-meta">
                  <span className="protein">💪 {p.protein}g</span>
                  <span className="category">{p.category}</span>
                </div>

                <div className="card-footer">
                  <span className="card-price">₹{p.price}</span>
                  <button onClick={(e) => addToCart(e, p)}>
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}