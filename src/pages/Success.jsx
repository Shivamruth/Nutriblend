import { useEffect, useState } from "react";
import "../styles/success.css";

export default function Success({ setPage }) {
  const [address, setAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("");

  useEffect(() => {
    const savedAddress = JSON.parse(localStorage.getItem("selectedAddress"));
    const savedPayment =
      localStorage.getItem("lastPaymentMethod") ||
      localStorage.getItem("paymentMethod") ||
      "";

    setAddress(savedAddress);
    setPaymentMethod(savedPayment);
  }, []);

  return (
    <div className="success-container">
      <div className="success-box">
        <div className="checkmark-circle">
          <div className="checkmark" />
        </div>

        <p className="success-eyebrow">Order Confirmed</p>
        <h2>Order Placed Successfully!</h2>

        <p className="success-main-text">
          Your healthy fuel is being prepared. You can track your order status
          from the Orders page.
        </p>

        <div className="success-info-grid">
          <div className="success-info-card">
            <span>Payment</span>
            <strong>{paymentMethod || "COD / Online"}</strong>
          </div>

          <div className="success-info-card">
            <span>Status</span>
            <strong>Placed</strong>
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
            <div>
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