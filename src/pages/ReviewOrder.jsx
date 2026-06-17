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
      const userId = session?.user?.id;

      if (!userId) {
        notify("Session expired — please login again", "error");
        return;
      }

      // Build the order row matching the DB schema
      const firstItem = localCart[0] || {};
      const orderPayload = {
        user_id: userId,
        email: session.user.email || null,
        product_name: firstItem.name || firstItem.product_name || "NutriBlend Order",
        price: Number(firstItem.price || 0),
        qty: localCart.reduce((sum, item) => sum + Number(item.qty || 1), 0),
        subtotal: total,
        total: total,
        delivery_fee: 0,
        delivery_option: null,
        delivery_status: "Pending",
        payment_method: payment,
        payment_status: payment === "COD" ? "Pending" : "Pending",
        status: "Placed",
        address: address,
        items: localCart.map((item) => ({
          id: item.id,
          name: item.name || item.product_name,
          price: Number(item.price || 0),
          qty: Number(item.qty || 1),
          image: item.image || null,
          isPlan: item.isPlan || false,
        })),
      };

      const { data, error } = await supabase
        .from("orders")
        .insert([orderPayload])
        .select("id")
        .single();

      if (error) {
        console.error("Order insert error:", error);
        notify(error.message || "Error placing order ❌", "error");
        return;
      }

      const orderId = data?.id;

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
    } catch (err) {
      console.error("Place order error:", err);
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
