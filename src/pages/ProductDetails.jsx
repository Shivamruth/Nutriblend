import { useMemo, useState } from "react";
import { fallbackProductImage, getProductImage } from "../utils/productImages";
import "../styles/product-details.css";

const splitTextList = (value) => {
  if (!value) return [];

  return String(value)
    .split(/,|\n|•/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseIngredients = (value) => {
  if (!value) return [];

  return String(value)
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const proteinMatch = item.match(/(\d+\s?g)\s*$/i);
      const protein = proteinMatch ? proteinMatch[1] : "N/A";

      const withoutProtein = proteinMatch
        ? item.replace(proteinMatch[1], "").trim()
        : item;

      const quantityMatch = withoutProtein.match(
        /(\d+(\.\d+)?\s?(ml|g|kg|tbsp|tsp|scoop|scoops|pcs|piece|pieces)|¼\s?scoop|½\s?scoop|¾\s?scoop|1\/2\s?scoop|1\/4\s?scoop|1\.5\s?scoop)/i
      );

      const quantity = quantityMatch ? quantityMatch[0] : "As required";

      const name = quantityMatch
        ? withoutProtein.replace(quantityMatch[0], "").trim()
        : withoutProtein;

      return {
        name: name || item,
        quantity,
        protein,
      };
    });
};

export default function ProductDetails({ product, setPage }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const isPlan = product?.isPlan;
  const stockStatus = product?.stock_status || "In Stock";
const normalizedStock = stockStatus.toLowerCase().replaceAll("_", " ");
const isOutOfStock = !isPlan && normalizedStock === "out of stock";

  const ingredients = useMemo(() => {
    if (isPlan) return [];
    return parseIngredients(product?.ingredients);
  }, [product, isPlan]);

  const benefits = useMemo(() => {
    if (isPlan) return product?.includes || [];
    return splitTextList(product?.benefits);
  }, [product, isPlan]);

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

  const addToCart = () => {
    if (isOutOfStock) {
      alert("This product is currently out of stock.");
      return;
    }

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
    setTimeout(() => setAdded(false), 1800);

    const cartIcon = document.getElementById("cart-icon");

    if (cartIcon) {
      cartIcon.classList.add("bump");
      setTimeout(() => cartIcon.classList.remove("bump"), 400);
    }
  };

  const buyNow = () => {
    if (isOutOfStock) {
      alert("This product is currently out of stock.");
      return;
    }

    addToCart();
    setPage("address");
  };

  const displayProtein = product.protein || (isPlan ? "Plan" : "N/A");
  const displayQuantity = product.quantity || product.duration || "Serving";
  const displayCalories = product.calories || "";
  const bestFor = product.bestFor || product.best_for || "";

  return (
    <div className="product-details-page">
      <div
        className={`product-details-card ${
          isPlan ? "plan-details-card" : ""
        } ${isOutOfStock ? "out-of-stock-details" : ""}`}
      >
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

          {product.tag && (
            <div className="product-detail-tag">{product.tag}</div>
          )}
        </div>

        <div className="product-info-section">
          <span className="category">
            {isPlan ? "Subscription Plan" : product.category || "Product"}
          </span>

          <h2>{product.name}</h2>

          <div className="product-badges-row">
            <span>💪 {displayProtein}</span>
            <span>🥤 {displayQuantity}</span>
            {displayCalories && <span>🔥 {displayCalories}</span>}
            {isPlan && product.duration && <span>📅 {product.duration}</span>}
          </div>

          {!isPlan && stockStatus !== "In Stock" && (
  <div
    className={`product-stock-status ${stockStatus
      .toLowerCase()
      .replaceAll(" ", "-")}`}
  >
    {stockStatus}
  </div>
)}

          <p className="product-detail-desc">
            {product.description ||
              "High-quality NutriBlend item designed to support your daily nutrition, protein intake, and fitness goals."}
          </p>

          <div className="product-price-row single-price">
            <div>
              <span>Price</span>
              <h3>₹{product.price}</h3>
            </div>
          </div>

          {bestFor && (
            <div className="product-best-box">
              <strong>Best For</strong>
              <p>{bestFor}</p>
            </div>
          )}

          {isPlan && benefits.length > 0 && (
            <div className="product-plan-box">
              <h3>Plan Includes</h3>

              <div className="product-benefits-list">
                {benefits.map((item) => (
                  <span key={item}>✓ {item}</span>
                ))}
              </div>
            </div>
          )}

          {!isPlan && ingredients.length > 0 && (
            <div className="ingredients-section">
              <h3>Ingredients & Protein Breakdown</h3>

              <div className="ingredients-table">
                <div className="ingredients-head">
                  <span>Ingredient</span>
                  <span>Quantity</span>
                  <span>Protein</span>
                </div>

                {ingredients.map((item, index) => (
                  <div className="ingredients-row" key={`${item.name}-${index}`}>
                    <span>{item.name}</span>
                    <span>{item.quantity}</span>
                    <span>{item.protein}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isPlan && product.ingredients && ingredients.length === 0 && (
            <div className="ingredients-section">
              <h3>Ingredients</h3>
              <p className="product-detail-desc">{product.ingredients}</p>
            </div>
          )}

          {!isPlan && benefits.length > 0 && (
            <div className="product-benefits-section">
              <h3>Benefits</h3>

              <div className="product-benefits-list">
                {benefits.map((benefit) => (
                  <span key={benefit}>✓ {benefit}</span>
                ))}
              </div>
            </div>
          )}

          <div className="qty-box">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              disabled={isOutOfStock}
            >
              −
            </button>
            <span>{qty}</span>
            <button onClick={() => setQty(qty + 1)} disabled={isOutOfStock}>
              +
            </button>
          </div>

          <div className="product-detail-actions">
            <button
              className={`product-add-btn ${added ? "added" : ""}`}
              onClick={addToCart}
              disabled={isOutOfStock}
            >
              {isOutOfStock
                ? "Out of Stock"
                : added
                ? "✔ Added to Cart"
                : isPlan
                ? "Add Plan"
                : "Add to Cart"}
            </button>

            <button className="buy-btn" onClick={buyNow} disabled={isOutOfStock}>
              {isOutOfStock ? "Unavailable" : isPlan ? "Buy Plan ⚡" : "Buy Now ⚡"}
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