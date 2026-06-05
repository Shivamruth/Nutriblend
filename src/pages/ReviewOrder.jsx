import { useState, useEffect } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";
import "../styles/review-order.css";

const formatMoney = (value) =>
  value ? `₹${Number(value).toLocaleString("en-IN")}` : "₹0";

/**
 * After a successful order, if the cart contains plan items (isPlan === true),
 * record them in the monthly_subscriptions table.
 */
const createSubscriptionsForPlans = async (orderId, cartItems, userId) => {
  const planItems = cartItems.filter((item) => item.isPlan === true);
  if (!planItems.length || !userId) return;

  const rows = planItems.map((item) => ({
    user_id: userId,
    plan_name: item.name || "Monthly Plan",
    plan_price: Number(item.price || 0),
    plan_duration: "Monthly",
    plan_protein: item.protein || item.description || null,
    status: "active",
    start_date: new Date().toISOString(),
    end_date: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d.toISOString();
    })(),
    order_id: orderId || null,
  }));

  const { error } = await supabase.from("monthly_subscriptions").insert(rows);
  if (error) {
    console.error("Subscription creation error:", error);
  }
};

export default function ReviewOrder({ cart: _cart, address, payment, setPage }) {
  const [loading, setLoading] = useState(false);
  const [localCart, setLocalCart] = useState([]);
  const { notify } = useNotification();

  useEffect(() => {
    const latestCart = JSON.parse(localStorage.getItem("cart")) || [];
    setLocalCart(latestCart);
  }, []);

  const total = localCart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const hasPlanItems = localCart.some((item) => item.isPlan === true);

  const placeOrder = async () => {
    if (!localCart.length) { notify("Cart is empty ❌", "error"); return; }
    if (!address) { notify("Address missing ❌", "error"); return; }
    if (!payment) { notify("Select payment ❌", "error"); return; }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

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
          userId,
          paymentMethod: payment,
        }),
      });

      const json = await res.json();

      if (json.success) {
        const orderId = json.orderId || json.data?.id;

        // Create subscription rows for any plan items
        if (hasPlanItems && userId) {
          await createSubscriptionsForPlans(orderId, localCart, userId);
        }

        // Store order info for Success page
        if (orderId) {
          localStorage.setItem("lastOrderId", String(orderId));
        }
        localStorage.setItem("lastPaymentMethod", payment);
        localStorage.setItem("lastOrderTotal", String(total));

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
            <span>
              {item.name} × {item.qty}
              {item.isPlan && (
                <span style={{
                  marginLeft: 8,
                  fontSize: 11,
                  background: "rgba(132,204,22,0.15)",
                  color: "#84cc16",
                  padding: "2px 7px",
                  borderRadius: 999,
                  fontWeight: 600,
                }}>
                  Monthly Plan
                </span>
              )}
            </span>
            <span className="text-primary">
              {item.price > 0 ? formatMoney(item.price * item.qty) : "Price on request"}
            </span>
          </div>
        ))}

        {hasPlanItems && (
          <div style={{
            marginTop: 12,
            padding: "10px 14px",
            background: "rgba(132,204,22,0.06)",
            borderRadius: 10,
            border: "1px solid rgba(132,204,22,0.18)",
            fontSize: 13,
            color: "#84cc16",
          }}>
            📋 A monthly subscription will be activated in My Subscriptions after payment.
          </div>
        )}
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
          <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--primary)" }}>
            {total > 0 ? formatMoney(total) : "Price on request"}
          </span>
        </div>
      </div>

      <button className="pay-btn" onClick={placeOrder} disabled={loading}>
        {loading ? "Placing Order..." : "Confirm & Place Order"}
      </button>
    </div>
  );
}
