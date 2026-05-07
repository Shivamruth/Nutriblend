import { useEffect, useState } from "react";
import "../styles/cart.css";

const fallbackProductImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%230c1a30'/%3E%3Ctext x='30' y='37' text-anchor='middle' fill='%237cff6b' font-family='Arial,sans-serif' font-size='24' font-weight='700'%3EN%3C/text%3E%3C/svg%3E";

export default function Cart({ setPage }) {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    loadCart();

    window.addEventListener("cartUpdated", loadCart);
    window.addEventListener("storage", loadCart);

    return () => {
      window.removeEventListener("cartUpdated", loadCart);
      window.removeEventListener("storage", loadCart);
    };
  }, []);

  const loadCart = () => {
    const data = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(data);
  };

  const updateStorage = (updated) => {
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("cartUpdated"));
    window.dispatchEvent(new Event("storage"));
  };

  const updateQty = (id, change) => {
    const updated = cart
      .map((item) =>
        item.id === id
          ? { ...item, qty: Number(item.qty || 1) + change }
          : item
      )
      .filter((item) => Number(item.qty || 1) > 0);

    updateStorage(updated);
  };

  const removeItem = (id) => {
    const updated = cart.filter((item) => item.id !== id);
    updateStorage(updated);
  };

  const clearCart = () => {
    const confirmClear = window.confirm("Are you sure you want to clear cart?");
    if (!confirmClear) return;

    localStorage.removeItem("cart");
    setCart([]);
    window.dispatchEvent(new Event("cartUpdated"));
    window.dispatchEvent(new Event("storage"));
  };

  const getItemName = (item) => {
    return item.name || item.product_name || "NutriBlend Item";
  };

  const getItemSubtotal = (item) => {
    return Number(item.price || 0) * Number(item.qty || 1);
  };

  const total = cart.reduce((sum, item) => sum + getItemSubtotal(item), 0);

  const itemCount = cart.reduce(
    (sum, item) => sum + Number(item.qty || 1),
    0
  );

  const productCount = cart.filter((item) => !item.isPlan).length;
  const planCount = cart.filter((item) => item.isPlan).length;

  if (cart.length === 0) {
    return (
      <div className="cart-empty">
        <span className="cart-empty-icon">🛒</span>
        <h2>Your Cart is Empty</h2>
        <p className="cart-empty-subtitle">
          Looks like you haven&apos;t added any products or plans yet. Browse
          our protein-packed collection!
        </p>

        <button className="buy-btn" onClick={() => setPage("home")}>
          Start Shopping →
        </button>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <div className="cart-header">
        <div>
          <p className="cart-eyebrow">Checkout Bag</p>
          <h2>Your Cart</h2>
          <p className="cart-item-count">
            {itemCount} item{itemCount !== 1 ? "s" : ""} in your cart
          </p>
        </div>

        <button className="cart-clear-btn" onClick={clearCart}>
          Clear All
        </button>
      </div>

      <div className="cart-stats">
        <div className="cart-stat-card">
          <span>🥤</span>
          <div>
            <h3>{productCount}</h3>
            <p>Products</p>
          </div>
        </div>

        <div className="cart-stat-card">
          <span>📅</span>
          <div>
            <h3>{planCount}</h3>
            <p>Plans</p>
          </div>
        </div>

        <div className="cart-stat-card">
          <span>💰</span>
          <div>
            <h3>₹{total.toLocaleString("en-IN")}</h3>
            <p>Total</p>
          </div>
        </div>
      </div>

      <div className="cart-layout">
        <div className="cart-items">
          {cart.map((item, index) => {
            const isPlan = item.isPlan;

            return (
              <div
                key={item.id}
                className={`cart-card ${isPlan ? "cart-plan-card" : ""}`}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="cart-item-info">
                  {isPlan ? (
                    <div className="cart-plan-icon">
                      {item.image || "📅"}
                    </div>
                  ) : (
                    <img
                      src={item.image || fallbackProductImage}
                      alt={getItemName(item)}
                      className="cart-item-img"
                      onError={(e) => {
                        e.currentTarget.src = fallbackProductImage;
                      }}
                    />
                  )}

                  <div className="cart-item-main">
                    <div className="cart-item-title-row">
                      <h3>{getItemName(item)}</h3>

                      {isPlan ? (
                        <span className="cart-plan-badge">Plan</span>
                      ) : (
                        <span className="cart-product-badge">Product</span>
                      )}
                    </div>

                    {isPlan ? (
                      <div className="cart-plan-details">
                        <p>
                          <strong>Duration:</strong>{" "}
                          {item.duration || item.plan_duration || "N/A"}
                        </p>
                        <p>
                          <strong>Protein:</strong> {item.protein || "N/A"}
                        </p>
                        <p>
                          <strong>Best for:</strong>{" "}
                          {item.bestFor || item.plan_best_for || "Fitness users"}
                        </p>

                        {Array.isArray(item.includes || item.plan_includes) &&
                          (item.includes || item.plan_includes).length > 0 && (
                            <div className="cart-plan-includes">
                              {(item.includes || item.plan_includes)
                                .slice(0, 4)
                                .map((point) => (
                                  <span key={point}>✓ {point}</span>
                                ))}
                            </div>
                          )}
                      </div>
                    ) : (
                      <div className="cart-product-details">
                        <p className="cart-item-price">₹{item.price} each</p>

                        {item.protein && (
                          <p className="cart-item-protein">
                            💪 {item.protein}
                            {String(item.protein).toLowerCase().includes("g")
                              ? ""
                              : "g"}{" "}
                            protein
                          </p>
                        )}

                        {item.category && (
                          <p className="cart-item-category">
                            {item.category}
                          </p>
                        )}
                      </div>
                    )}

                    <p className="cart-item-subtotal">
                      Subtotal:{" "}
                      <strong>
                        ₹{getItemSubtotal(item).toLocaleString("en-IN")}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="cart-controls">
                  <div className="qty-controls">
                    <button onClick={() => updateQty(item.id, -1)}>−</button>
                    <span>{item.qty || 1}</span>
                    <button onClick={() => updateQty(item.id, 1)}>+</button>
                  </div>

                  <button
                    className="cart-remove-btn"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${getItemName(item)}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <aside className="cart-summary">
          <h3>Order Summary</h3>

          <div className="cart-summary-row">
            <span>Total Items</span>
            <span>{itemCount}</span>
          </div>

          <div className="cart-summary-row">
            <span>Products</span>
            <span>{productCount}</span>
          </div>

          <div className="cart-summary-row">
            <span>Plans</span>
            <span>{planCount}</span>
          </div>

          <div className="cart-summary-row">
            <span>Subtotal</span>
            <span>₹{total.toLocaleString("en-IN")}</span>
          </div>

          <div className="cart-summary-row">
            <span>Delivery</span>
            <span className="cart-free-badge">FREE</span>
          </div>

          <div className="cart-summary-divider" />

          <div className="cart-summary-row cart-summary-total">
            <span>Total</span>
            <span>₹{total.toLocaleString("en-IN")}</span>
          </div>

          <button className="buy-btn" onClick={() => setPage("address")}>
            Proceed to Checkout →
          </button>

          <button className="cart-continue-btn" onClick={() => setPage("home")}>
            Continue Shopping
          </button>
        </aside>
      </div>
    </div>
  );
}