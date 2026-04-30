import { useEffect, useState } from "react";

export default function Cart({ setPage }) {
  const [cart, setCart] = useState([]);

  // LOAD CART
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(data);
  }, []);

  // SAVE CART
  const updateStorage = (updated) => {
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  };

  // UPDATE QTY
  const updateQty = (id, change) => {
    const updated = cart
      .map((item) =>
        item.id === id
          ? { ...item, qty: (item.qty || 1) + change }
          : item
      )
      .filter((item) => item.qty > 0);

    updateStorage(updated);
  };

  // REMOVE ITEM
  const removeItem = (id) => {
    const updated = cart.filter((item) => item.id !== id);
    updateStorage(updated);
  };

  // CLEAR CART
  const clearCart = () => {
    localStorage.removeItem("cart");
    setCart([]);
  };

  // TOTAL
  const total = cart.reduce(
    (sum, item) => sum + (item.price || 0) * (item.qty || 1),
    0
  );

  const itemCount = cart.reduce((sum, item) => sum + (item.qty || 1), 0);

  // EMPTY
  if (cart.length === 0) {
    return (
      <div className="cart-empty">
        <span className="cart-empty-icon">🛒</span>
        <h2>Your Cart is Empty</h2>
        <p className="cart-empty-subtitle">
          Looks like you haven't added any products yet.
          Browse our protein-packed collection!
        </p>
        <button className="buy-btn" onClick={() => setPage("home")}>
          Start Shopping →
        </button>
      </div>
    );
  }

  return (
    <div className="cart-container">
      {/* Header */}
      <div className="cart-header">
        <div>
          <h2>Your Cart</h2>
          <p className="cart-item-count">
            {itemCount} item{itemCount !== 1 ? "s" : ""} in your cart
          </p>
        </div>
        <button className="cart-clear-btn" onClick={clearCart}>
          Clear All
        </button>
      </div>

      {/* Cart Items */}
      <div className="cart-items">
        {cart.map((item, index) => (
          <div
            key={item.id}
            className="cart-card"
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            <div className="cart-item-info">
              {item.image && (
                <img
                  src={item.image}
                  alt={item.name}
                  className="cart-item-img"
                  onError={(e) =>
                    (e.target.src =
                      "https://via.placeholder.com/60x60/0c1a30/7cff6b?text=N")
                  }
                />
              )}
              <div>
                <h3>{item.name}</h3>
                <p className="cart-item-price">₹{item.price} each</p>
                <p className="cart-item-subtotal">
                  Subtotal: <strong>₹{item.price * item.qty}</strong>
                </p>
              </div>
            </div>

            <div className="qty-controls">
              <button onClick={() => updateQty(item.id, -1)}>−</button>
              <span>{item.qty}</span>
              <button onClick={() => updateQty(item.id, 1)}>+</button>
            </div>

            <button
              className="cart-remove-btn"
              onClick={() => removeItem(item.id)}
              aria-label={`Remove ${item.name}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="cart-summary">
        <div className="cart-summary-row">
          <span>Items ({itemCount})</span>
          <span>₹{total}</span>
        </div>
        <div className="cart-summary-row">
          <span>Delivery</span>
          <span className="cart-free-badge">FREE</span>
        </div>
        <div className="cart-summary-divider" />
        <div className="cart-summary-row cart-summary-total">
          <span>Total</span>
          <span>₹{total}</span>
        </div>
      </div>

      <button className="buy-btn" onClick={() => setPage("address")}>
        Proceed to Checkout →
      </button>
    </div>
  );
}