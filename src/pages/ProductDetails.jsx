import { useState } from "react";

const fallbackProductImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%230c1a30'/%3E%3Ctext x='200' y='154' text-anchor='middle' fill='%237cff6b' font-family='Arial,sans-serif' font-size='28' font-weight='700'%3ENutriBlend%3C/text%3E%3C/svg%3E";

export default function ProductDetails({ product, setPage }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product) {
    return (
      <div className="product-details-page">
        <div className="product-not-found">
          <span className="home-empty-icon">🔍</span>
          <h2>Product not found</h2>
          <button className="buy-btn" onClick={() => setPage("home")}>← Back to Store</button>
        </div>
      </div>
    );
  }

  const addToCart = () => {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const existing = cart.find((item) => item.id === product.id);
    if (existing) { existing.qty += qty; }
    else { cart.push({ ...product, qty }); }
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("storage"));
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    const cartIcon = document.getElementById("cart-icon");
    if (cartIcon) { cartIcon.classList.add("bump"); setTimeout(() => cartIcon.classList.remove("bump"), 400); }
  };

  return (
    <div className="product-details-page">
      <div className="product-details-card">
        <div className="product-image-section">
          <img src={product.image} alt={product.name} onError={(e) => (e.currentTarget.src = fallbackProductImage)} />
          {product.tag && <div className="product-detail-tag">{product.tag}</div>}
        </div>

        <div className="product-info-section">
          <span className="category">{product.category}</span>
          <h2>{product.name}</h2>
          <p className="product-detail-protein">💪 {product.protein}g Protein per serving</p>
          <p className="product-detail-desc">
            {product.description || "High-quality supplement designed to boost your performance and recovery. Made with premium ingredients for maximum results."}
          </p>

          <div className="product-detail-price">₹{product.price}</div>

          <div className="qty-box">
            <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
            <span>{qty}</span>
            <button onClick={() => setQty(qty + 1)}>+</button>
          </div>

          <div className="product-detail-actions">
            <button className={`product-add-btn ${added ? "added" : ""}`} onClick={addToCart}>
              {added ? "✔ Added to Cart" : "Add to Cart"}
            </button>
            <button className="buy-btn" onClick={() => { addToCart(); setPage("address"); }}>
              Buy Now ⚡
            </button>
          </div>

          <button className="product-back-btn" onClick={() => setPage("home")}>
            ← Back to Products
          </button>
        </div>
      </div>
    </div>
  );
}
