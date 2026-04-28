import { useEffect, useState } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";

export default function Home({ search }) {
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
  function addToCart(product) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    const existing = cart.find((i) => i.id === product.id);

    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ ...product, qty: 1 });
    }

    localStorage.setItem("cart", JSON.stringify(cart));

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

  return (
    <div className="home-container">

      {/* HEADER */}
      <div className="home-header">
        <h1>🥤 Protein Store</h1>

        <button
          className="filter-icon"
          onClick={() => setShowFilters(!showFilters)}
        >
          {/* ✅ FIXED SVG */}
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

      {/* FILTER PANEL */}
      {showFilters && (
        <div className="filter-panel">

          <div className="filter-group">
            <button onClick={() => setFilter("All")}>All</button>
            <button onClick={() => setFilter("Natural")}>🌿 Natural</button>
            <button onClick={() => setFilter("Whey")}>💪 Whey</button>
            <button onClick={() => setFilter("Pre")}>⚡ Pre</button>
          </div>

          <div className="filter-group">
            <button onClick={() => setSort("priceLow")}>₹ Low → High</button>
            <button onClick={() => setSort("priceHigh")}>₹ High → Low</button>
            <button onClick={() => setSort("protein")}>💪 Protein</button>
          </div>

        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <p style={{ textAlign: "center" }}>Loading products...</p>
      ) : filtered.length === 0 ? (
        <p style={{ textAlign: "center" }}>No products found 😢</p>
      ) : (
        <div className="grid">
          {filtered.map((p) => (
            <div key={p.id} className="card">

              <img
                src={p.image}
                className="product-img"
                alt={p.name}
                onError={(e) =>
                  (e.target.src =
                    "https://via.placeholder.com/150")
                }
              />

              <h3>{p.name}</h3>

              <p className="protein">💪 {p.protein}g</p>

              <p>₹{p.price}</p>

              <p className="category">{p.category}</p>

              <button onClick={() => addToCart(p)}>
                Add to Cart
              </button>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}