import { useState } from "react";
import { fallbackProductImage, getProductImage } from "../utils/productImages";
import { getProductExtraDetails } from "../data/productDetailsData";
import "../styles/product-details.css";

export default function ProductDetails({ product, setPage }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product) {
    return (
      <div className="product-details-page">
        <div className="product-not-found">
          <span className="home-empty-icon">🔍</span>
          <h2>Product not found</h2>
          <button className="buy-btn" onClick={() => setPage("home")}>
            ← Back to Store
          </button>
        </div>
      </div>
    );
  }

  const isPlan = product.isPlan;
  const extra = getProductExtraDetails(product);

  const addToCart = () => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const existing = cart.find((item) => item.id === product.id);

    let updatedCart;

    if (existing) {
      updatedCart = cart.map((item) =>
        item.id === product.id
          ? { ...item, qty: Number(item.qty || 1) + qty }
          : item
      );
    } else {
      updatedCart = [
        ...cart,
        {
          ...product,
          qty,
          product_name: product.name,
          plan_duration: product.duration || null,
          plan_best_for: product.bestFor || null,
          plan_includes: product.includes || [],
        },
      ];
    }

    localStorage.setItem("cart", JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("cartUpdated"));

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);

    const cartIcon = document.getElementById("cart-icon");
    if (cartIcon) {
      cartIcon.classList.add("bump");
      setTimeout(() => cartIcon.classList.remove("bump"), 400);
    }
  };

  const buyNow = () => {
    addToCart();
    setPage("address");
  };

  const displayProtein = extra?.totalProtein || `${product.protein || 0}g`;

  return (
    <div className="product-details-page">
      <div className={`product-details-card ${isPlan ? "plan-details-card" : ""}`}>
        <div className="product-image-section">
          {isPlan ? (
            <div className="product-plan-visual">
              <span>{product.image || "📅"}</span>
              <p>{product.duration}</p>
            </div>
          ) : (
            <img
              src={getProductImage(product)}
              alt={product.name}
              onError={(e) => {
                e.currentTarget.src = fallbackProductImage;
              }}
            />
          )}

          {product.tag && <div className="product-detail-tag">{product.tag}</div>}
        </div>

        <div className="product-info-section">
          <span className="category">
            {isPlan ? "Subscription Plan" : product.category}
          </span>

          <h2>{product.name}</h2>

          <div className="product-badges-row">
            <span>💪 {displayProtein}</span>
            {isPlan && <span>📅 {product.duration}</span>}
            {extra?.calories && <span>🔥 {extra.calories}</span>}
          </div>

          <p className="product-detail-desc">
            {product.description ||
              "High-quality shake designed to support your protein intake, performance, and recovery."}
          </p>

          <div className="product-price-row">
            <div>
              <span>Price</span>
              <h3>₹{product.price}</h3>
            </div>
          </div>

          {extra?.bestFor && (
            <div className="product-best-box">
              <strong>Best For</strong>
              <p>{extra.bestFor}</p>
            </div>
          )}

          {isPlan && (
            <div className="product-plan-box">
              <h3>Plan Includes</h3>
              <div className="product-benefits-list">
                {product.includes?.map((item) => (
                  <span key={item}>✓ {item}</span>
                ))}
              </div>
            </div>
          )}

          {extra?.ingredients?.length > 0 && (
            <div className="ingredients-section">
              <h3>Ingredients & Protein Breakdown</h3>

              <div className="ingredients-table">
                <div className="ingredients-head">
                  <span>Ingredient</span>
                  <span>Quantity</span>
                  <span>Protein</span>
                </div>

                {extra.ingredients.map((item) => (
                  <div className="ingredients-row" key={item.name}>
                    <span>{item.name}</span>
                    <span>{item.quantity}</span>
                    <span>{item.protein}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {extra?.benefits?.length > 0 && (
            <div className="product-benefits-section">
              <h3>Benefits</h3>
              <div className="product-benefits-list">
                {extra.benefits.map((benefit) => (
                  <span key={benefit}>✓ {benefit}</span>
                ))}
              </div>
            </div>
          )}


          <div className="qty-box">
            <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
            <span>{qty}</span>
            <button onClick={() => setQty(qty + 1)}>+</button>
          </div>

          <div className="product-detail-actions">
            <button
              className={`product-add-btn ${added ? "added" : ""}`}
              onClick={addToCart}
            >
              {added ? "✔ Added to Cart" : isPlan ? "Add Plan" : "Add to Cart"}
            </button>

            <button className="buy-btn" onClick={buyNow}>
              {isPlan ? "Buy Plan ⚡" : "Buy Now ⚡"}
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