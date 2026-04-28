import { useEffect } from "react";

export default function Success({ setPage }) {
  return (
    <div className="success-container">
      <div className="success-box">

        <div className="checkmark-circle">
          <div className="checkmark"></div>
        </div>

        <h2>Order Placed Successfully 🎉</h2>
        <p>Your healthy fuel is on the way 🚀</p>

        <button onClick={() => setPage("home")}>
          Back to Home
        </button>

      </div>
    </div>
  );
}