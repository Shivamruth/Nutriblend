import { useState, useEffect } from "react";
import { useNotification } from "../context/NotificationContext";

export default function ReviewOrder({ cart, address, payment, setPage }) {
  const [loading, setLoading] = useState(false);
  const [localCart, setLocalCart] = useState([]);
  const { notify } = useNotification();

  useEffect(() => {
    const latestCart = JSON.parse(localStorage.getItem("cart")) || [];
    setLocalCart(latestCart);
  }, []);

  const total = localCart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const placeOrder = async () => {
    if (!localCart.length) { notify("Cart is empty ❌", "error"); return; }
    if (!address) { notify("Address missing ❌", "error"); return; }
    if (!payment) { notify("Select payment ❌", "error"); return; }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const { data: userData } = await supabase.auth.getUser();

      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          amount: total,
          items: localCart,
          address,
          userId: userData.user?.id,
          paymentMethod: payment,
        }),
      });

      const json = await res.json();

      if (json.success) {
        localStorage.removeItem("cart");
        window.dispatchEvent(new Event("storage"));
        notify("Order placed successfully ✅", "success");
        setPage("success");
      } else {
        notify(json.message || "Error placing order ❌", "error");
      }
    } catch (err) {
      console.error(err);
      notify("Something went wrong ❌", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="review-container">
      <p className="review-eyebrow">Final Step</p>
      <h2>Review Your Order</h2>

      {/* Items */}
      <div className="section">
        <h3>🛒 Order Items</h3>
        {localCart.map((item, i) => (
          <div key={i} className="review-item">
            <span>{item.name} × {item.qty}</span>
            <span className="text-primary">₹{item.price * item.qty}</span>
          </div>
        ))}
      </div>

      {/* Address */}
      <div className="section">
        <h3>📍 Delivery Address</h3>
        {address ? (
          <>
            <p><strong>{address.name}</strong></p>
            <p className="text-muted">{address.street}, {address.city} - {address.pincode}</p>
            <p className="text-muted">{address.phone}</p>
          </>
        ) : (
          <p className="text-muted">No address selected</p>
        )}
      </div>

      {/* Payment */}
      <div className="section">
        <h3>💳 Payment Method</h3>
        <p>{payment || "Not selected"}</p>
      </div>

      {/* Total */}
      <div className="section">
        <div className="review-item" style={{ borderBottom: "none" }}>
          <span style={{ fontSize: "1.2rem", fontWeight: 800 }}>Total</span>
          <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--primary)" }}>₹{total}</span>
        </div>
      </div>

      <button className="pay-btn" onClick={placeOrder} disabled={loading}>
        {loading ? "Placing Order..." : "Confirm & Place Order"}
      </button>
    </div>
  );
}