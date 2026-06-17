import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";
import { fallbackProductImage, getProductImage, withProductImage } from "../utils/productImages";
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

export default function ProductDetails({ product: initialProduct, productId, setPage }) {
  const [product, setProduct] = useState(initialProduct || null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { notify } = useNotification();

  // Fetch product from Supabase if not passed via in-memory state
  const fetchProduct = useCallback(async (id) => {
    if (!id) return;
    setFetchLoading(true);
    setFetchError(false);

    try {
      // Try products table first
      const { data: productData } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (productData) {
        setProduct(withProductImage({
          ...productData,
          is_active: productData.is_active !== false,
          stock_status: productData.stock_status || "In Stock",
        }));
        setFetchLoading(false);
        return;
      }

      // Fallback: try plans table
      const { data: planData } = await supabase
        .from("plans")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (planData) {
        setProduct({
          id: planData.id,
          name: planData.name,
          category: "Plans",
          price: planData.price,
          protein: planData.protein,
          duration: planData.duration,
          tag: planData.tag,
          image: planData.image || "📅",
          description: planData.description,
          bestFor: planData.best_for,
          includes: String(planData.includes || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          isPlan: true,
          stock_status: "In Stock",
        });
        setFetchLoading(false);
        return;
      }

      // Not found in either table
      setFetchError(true);
    } catch (err) {
      console.error("Product fetch error:", err);
      setFetchError(true);
    } finally {
      setFetchLoading(false);
    }
  }, []);

  useEffect(() => {
    // Use in-memory product if available (same-session navigation = instant)
    if (initialProduct) {
      setProduct(initialProduct);
      return;
    }

    // Otherwise fetch by ID from URL
    if (productId) {
      fetchProduct(productId);
    }
  }, [initialProduct, productId, fetchProduct]);

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

  // Loading state (fetching from Supabase)
  if (fetchLoading) {
    return (
      <div className="product-details-page">
        <div className="product-not-found">
          <div className="admin-login-spinner" style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "al-spin 0.65s linear infinite" }} />
          <h2>Loading product...</h2>
        </div>
      </div>
    );
  }

  // Not found state
  if (!product || fetchError) {
    return (
      <div className="product-details-page">
        <div className="product-not-found">
          <span className="home-empty-icon">🔍</span>
          <h2>Product not found</h2>
          <p>This product may have been removed or the link is invalid.</p>

          <button className="buy-btn" onClick={() => setPage("home")}>
            ← Back to Store
          </button>
        </div>
      </div>
    );
  }

  const addToCart = (e) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (isOutOfStock) {
      notify("This product is currently out of stock", "error");
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
    notify("Added to cart", "success");
    setTimeout(() => setAdded(false), 1800);

    const cartIcon = document.getElementById("cart-icon");

    if (cartIcon) {
      cartIcon.classList.add("bump");
      setTimeout(() => cartIcon.classList.remove("bump"), 400);
    }
  };

  const buyNow = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) {
      notify("This product is currently out of stock", "error");
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
              loading="lazy"
              decoding="async"
              width="800"
              height="800"
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
              type="button"
              onClick={() => setQty(Math.max(1, qty - 1))}
              disabled={isOutOfStock}
            >
              −
            </button>
            <span>{qty}</span>
            <button type="button" onClick={() => setQty(qty + 1)} disabled={isOutOfStock}>
              +
            </button>
          </div>

          <div className="product-detail-actions">
            <button
              type="button"
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

            <button type="button" className="buy-btn" onClick={buyNow} disabled={isOutOfStock}>
              {isOutOfStock ? "Unavailable" : isPlan ? "Buy Plan ⚡" : "Buy Now ⚡"}
            </button>
          </div>

          <button type="button" className="product-back-btn" onClick={() => setPage("home")}>
            ← Back to Products
          </button>
        </div>
      </div>
    </div>
  );
}
