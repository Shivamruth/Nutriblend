import { useEffect, useMemo, useState } from "react";
import "../styles/success.css";

const formatMoney = (value) => {
  const amount = Number(value || 0);
  if (!amount) return "Available in Orders";
  return `Rs. ${amount.toLocaleString("en-IN")}`;
};

const formatOrderId = (orderId) => {
  if (!orderId) return "Available in Orders";
  return `NB-${String(orderId).padStart(6, "0")}`;
};

export default function Success({ setPage }) {
  const [orderInfo, setOrderInfo] = useState({
    address: null,
    paymentMethod: "",
    orderId: "",
    total: "",
    deliveryTitle: "",
    deliveryEta: "",
    placedAt: "",
  });

  useEffect(() => {
    let savedAddress = null;

    try {
      savedAddress = JSON.parse(localStorage.getItem("selectedAddress"));
    } catch {
      savedAddress = null;
    }

    setOrderInfo({
      address: savedAddress,
      paymentMethod:
        localStorage.getItem("lastPaymentMethod") ||
        localStorage.getItem("paymentMethod") ||
        "",
      orderId:
        localStorage.getItem("lastOrderId") ||
        localStorage.getItem("lastFullOrderId") ||
        "",
      total: localStorage.getItem("lastOrderTotal") || "",
      deliveryTitle: localStorage.getItem("lastDeliveryTitle") || "",
      deliveryEta: localStorage.getItem("lastDeliveryEta") || "",
      placedAt: new Date().toISOString(),
    });
  }, []);

  const displayPayment = useMemo(() => {
    const value = String(orderInfo.paymentMethod || "").trim();
    if (!value) return "Payment recorded";
    if (value === "COD") return "Cash on Delivery";
    if (value === "Online") return "Razorpay";
    return value;
  }, [orderInfo.paymentMethod]);

  const displayTime = useMemo(() => {
    if (!orderInfo.placedAt) return "Just now";

    return new Date(orderInfo.placedAt).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [orderInfo.placedAt]);

  const estimatedDelivery = useMemo(() => {
    const city = orderInfo.address?.city ? ` in ${orderInfo.address.city}` : "";
    const option = orderInfo.deliveryTitle || "Standard Delivery";
    const eta = orderInfo.deliveryEta || "Today / Tomorrow";
    return `${option}: expected ${eta}${city}. Track live status from Orders.`;
  }, [orderInfo.address, orderInfo.deliveryEta, orderInfo.deliveryTitle]);

  const openWhatsAppSupport = () => {
    const orderLabel = orderInfo.orderId
      ? `order ${formatOrderId(orderInfo.orderId)}`
      : "my recent order";
    const message = encodeURIComponent(
      `Hi NutriBlend, I need help with ${orderLabel}.`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="success-container">
      <section className="success-box">
        <div className="success-checkmark" aria-hidden="true">
          <svg viewBox="0 0 80 80" role="img">
            <circle className="success-checkmark-circle" cx="40" cy="40" r="34" />
            <path className="success-checkmark-path" d="M24 41.5 35 52 57 29" />
          </svg>
        </div>

        <p className="success-eyebrow">Payment Complete</p>
        <h1>Order Confirmed</h1>
        <p className="success-main-text">
          Your NutriBlend order has been placed successfully. We have saved your
          order details and will start preparing it shortly.
        </p>

        <div className="success-info-grid">
          <div className="success-info-card">
            <span>Order ID</span>
            <strong>{formatOrderId(orderInfo.orderId)}</strong>
          </div>

          <div className="success-info-card">
            <span>Payment Method</span>
            <strong>{displayPayment}</strong>
          </div>

          <div className="success-info-card">
            <span>Total Amount</span>
            <strong>{formatMoney(orderInfo.total)}</strong>
          </div>

          <div className="success-info-card">
            <span>Placed At</span>
            <strong>{displayTime}</strong>
          </div>
        </div>

        <div className="success-estimate-card">
          <span>ETA</span>
          <div>
            <h3>Estimated Delivery</h3>
            <p>{estimatedDelivery}</p>
            <small>Status starts as Pending and updates as your order moves.</small>
          </div>
        </div>

        {orderInfo.address && (
          <div className="success-address-card">
            <div className="success-address-head">
              <span>ADR</span>
              <div>
                <h3>Selected Address</h3>
                <p>
                  {orderInfo.address.name}{" "}
                  {orderInfo.address.type ? `- ${orderInfo.address.type}` : ""}
                </p>
              </div>
            </div>

            <p className="success-address-text">
              {orderInfo.address.street}, {orderInfo.address.city},{" "}
              {orderInfo.address.state} - {orderInfo.address.pincode}
            </p>
            <p className="success-address-phone">{orderInfo.address.phone}</p>
          </div>
        )}

        <div className="success-actions">
          <button type="button" onClick={() => setPage("orders")}>
            Track Order
          </button>
          <button
            type="button"
            className="success-home-btn"
            onClick={() => setPage("home")}
          >
            Continue Shopping
          </button>
          <button
            type="button"
            className="success-whatsapp-btn"
            onClick={openWhatsAppSupport}
          >
            WhatsApp Support
          </button>
        </div>
      </section>
    </div>
  );
}
