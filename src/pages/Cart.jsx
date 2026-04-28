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

  // EMPTY
  if (cart.length === 0) {
    return (
      <div className="cart-empty">
        <h2>Your Cart is Empty 😢</h2>
        <button onClick={() => setPage("home")}>
          Go Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <h2>Your Cart</h2>

      {cart.map((item) => (
        <div key={item.id} className="cart-card">
          <div>
            <h3>{item.name}</h3>
            <p>₹{item.price}</p>
            <p>Subtotal: ₹{item.price * item.qty}</p>
          </div>

          <div className="qty-controls">
            <button onClick={() => updateQty(item.id, -1)}>-</button>
            <span>{item.qty}</span>
            <button onClick={() => updateQty(item.id, 1)}>+</button>
          </div>

          <button onClick={() => removeItem(item.id)}>❌</button>
        </div>
      ))}

      <h3>Total: ₹{total}</h3>

      <div style={{ display: "flex", gap: "10px" }}>
        <button className="buy-btn" onClick={() => setPage("address")}>
          Buy Now
        </button>

        <button className="clear-btn" onClick={clearCart}>
          Clear Cart
        </button>
      </div>
    </div>
  );
}