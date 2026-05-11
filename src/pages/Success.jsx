import { useEffect, useMemo, useState } from "react";
import "../styles/success.css";

export default function Success({ setPage }) {
  const [address, setAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [orderTime, setOrderTime] = useState("");
  const [lastOrderId, setLastOrderId] = useState("");

  useEffect(() => {
    const savedAddress = JSON.parse(localStorage.getItem("selectedAddress"));
    const savedPayment =
      localStorage.getItem("lastPaymentMethod") ||
      localStorage.getItem("paymentMethod") ||
      "";

    const savedOrderId = localStorage.getItem("lastOrderId") || "";

    setAddress(savedAddress);
    setPaymentMethod(savedPayment);
    setLastOrderId(savedOrderId);
    setOrderTime(new Date().toISOString());
  }, []);

  const displayPayment = useMemo(() => {
    if (!paymentMethod) return "Order Payment";
    if (paymentMethod === "COD") return "Cash on Delivery";
    if (paymentMethod === "Online") return "Online Payment";
    return paymentMethod;
  }, [paymentMethod]);

  const displayTime = useMemo(() => {
    if (!orderTime) return "Just now";

    return new Date(orderTime).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [orderTime]);

  const deliveryMessage = useMemo(() => {
    if (displayPayment.toLowerCase().includes("cash")) {
      return "Keep cash or UPI ready at delivery time.";
    }

    if (displayPayment.toLowerCase().includes("online")) {
      return "Your online payment has been recorded. You can track the order from Orders.";
    }

    return "You can track the order from the Orders page.";
  }, [displayPayment]);

  return (
    <div className="success-container">
      <div className="success-box">
        <div className="success-glow" />

        <div className="checkmark-circle">
          <div className="checkmark" />
        </div>

        <p className="success-eyebrow">Order Confirmed</p>
        <h2>Order Placed Successfully!</h2>

        <p className="success-main-text">
          Your healthy fuel is being prepared. You can track preparation,
          delivery, and final status from the Orders page.
        </p>

        <div className="success-info-grid">
          <div className="success-info-card">
            <span>Payment</span>
            <strong>{displayPayment}</strong>
          </div>

          <div className="success-info-card">
            <span>Status</span>
            <strong>Placed</strong>
          </div>

          <div className="success-info-card">
            <span>Placed At</span>
            <strong>{displayTime}</strong>
          </div>

          <div className="success-info-card">
            <span>Tracking</span>
           <strong>
  {lastOrderId
    ? `NB-${String(lastOrderId).padStart(6, "0")}`
    : "Available in Orders"}
</strong>
          </div>
        </div>

        <div className="success-estimate-card">
          <span>🚚</span>
          <div>
            <h3>Estimated Delivery</h3>
            <p>
              Your order will move through preparation and delivery updates soon.
              {address?.city ? ` Delivery city: ${address.city}.` : ""}
            </p>
            <small>{deliveryMessage}</small>
          </div>
        </div>

        {address && (
          <div className="success-address-card">
            <div className="success-address-head">
              <span>📍</span>
              <div>
                <h3>Delivery Address</h3>
                <p>
                  {address.name} {address.type ? `• ${address.type}` : ""}
                </p>
              </div>
            </div>

            <p className="success-address-text">
              {address.street}, {address.city}, {address.state} -{" "}
              {address.pincode}
            </p>

            <p className="success-address-phone">📞 {address.phone}</p>
          </div>
        )}

        <div className="success-next-box">
          <h3>What happens next?</h3>

          <div className="success-steps">
            <div className="success-step-active">
              <span>1</span>
              <p>Order received</p>
            </div>

            <div>
              <span>2</span>
              <p>Preparing shake</p>
            </div>

            <div>
              <span>3</span>
              <p>Out for delivery</p>
            </div>

            <div>
              <span>4</span>
              <p>Delivered</p>
            </div>
          </div>
        </div>

        <div className="success-help-box">
          <span>💬</span>
          <p>
            Need to cancel or reorder later? Open the Orders page. Cancel option
            is available only before preparation starts.
          </p>
        </div>

        <div className="success-actions">
          <button onClick={() => setPage("orders")}>View Orders</button>

          <button className="success-home-btn" onClick={() => setPage("home")}>
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}