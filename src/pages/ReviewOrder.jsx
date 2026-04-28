import { useState, useEffect } from "react";

export default function ReviewOrder({
  cart,
  address,
  payment,
  setPage,
}) {
  const [loading, setLoading] = useState(false);
  const [localCart, setLocalCart] = useState([]);

  // ✅ ALWAYS GET LATEST CART
  useEffect(() => {
    const latestCart = JSON.parse(localStorage.getItem("cart")) || [];
    setLocalCart(latestCart);
  }, []);

  const total = localCart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  const placeOrder = async () => {
    if (!localCart.length) {
      notify("Cart is empty ❌", "error");
      return;
    }

    if (!address) {
      notify("Address missing ❌", "error");
      return;
    }

    if (!payment) {
      notify("Select payment ❌", "error");
      return;
    }

    try {
      setLoading(true);

      await fetch("http://localhost:5000/save-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: localCart,
          address,
          payment,
          total,
          status: "placed",
        }),
      });

      // ✅ CLEAR CART (CRITICAL FIX)
      localStorage.removeItem("cart");
      window.dispatchEvent(new Event("storage"));

      notify("Order placed successfully ✅", "success");

      setPage("success");
    } catch (err) {
      console.error(err);
      notify("Error placing order ❌", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-container">
      <div className="payment-card">

        <h2>🧾 Review Order</h2>

        {/* ITEMS */}
        <div>
          {localCart.map((item, i) => (
            <p key={i}>
              {item.name} x {item.qty} = ₹{item.price * item.qty}
            </p>
          ))}
        </div>

        <hr />

        {/* ADDRESS */}
        <p>
          📍 {address?.street}, {address?.city}
        </p>

        {/* PAYMENT */}
        <p>💳 {payment}</p>

        <h3>Total: ₹{total}</h3>

        <button
          className="pay-btn"
          onClick={placeOrder}
          disabled={loading}
        >
          {loading ? "Placing..." : "Place Order"}
        </button>

      </div>
    </div>
  );
}