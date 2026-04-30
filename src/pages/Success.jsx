export default function Success({ setPage }) {
  return (
    <div className="success-container">
      <div className="success-box">
        <div className="checkmark-circle">
          <div className="checkmark" />
        </div>

        <h2>Order Placed Successfully!</h2>
        <p>Your healthy fuel is on the way 🚀</p>
        <p className="text-muted" style={{ marginTop: "8px", fontSize: "0.9rem" }}>
          You'll receive a notification when your order ships.
        </p>

        <div className="success-actions">
          <button onClick={() => setPage("orders")}>
            View Orders
          </button>
          <button className="success-home-btn" onClick={() => setPage("home")}>
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}