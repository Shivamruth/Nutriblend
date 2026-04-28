import { useState, useEffect } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";

export default function Payment({ setPage, setPayment }) {
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState(null);
  const { notify } = useNotification();

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("selectedAddress"));
    setAddress(saved);
  }, []);

  const getCart = () => {
    return JSON.parse(localStorage.getItem("cart")) || [];
  };

  const getTotal = (cart) => {
    return cart.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1),
      0
    );
  };

  const saveOrder = async (paymentType) => {
    const cart = getCart();

    if (!cart.length) {
      notify("Cart is empty ❌", "error");
      return false;
    }

    if (!address) {
      notify("Select address first ❌", "error");
      return false;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      notify("Please login again ❌", "error");
      return false;
    }

    const total = getTotal(cart);

    const { error } = await supabase.from("orders").insert([
      {
        user_id: userData.user.id,
        items: cart,
        address,
        payment_method: paymentType,
        payment_status: paymentType === "Online" ? "paid" : "pending",
        total,
        status: "placed",
      },
    ]);

    if (error) {
      console.error("ORDER SAVE ERROR:", error);
      notify(error.message || "Order save failed ❌", "error");
      return false;
    }

    localStorage.removeItem("cart");
    window.dispatchEvent(new Event("storage"));

    return true;
  };

  const handleCOD = async () => {
    setLoading(true);

    const success = await saveOrder("COD");

    if (success) {
      setPayment("COD");
      notify("Order placed with COD ✅", "success");
      setPage("success");
    }

    setLoading(false);
  };

  const handleRazorpay = async () => {
    if (!address) {
      notify("Select address first ❌", "error");
      return;
    }

    const cart = getCart();

    if (!cart.length) {
      notify("Cart is empty ❌", "error");
      return;
    }

    try {
      setLoading(true);

      const total = getTotal(cart);

      const res = await fetch("http://localhost:5000/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      });

      const data = await res.json();

      if (!data.id) {
        notify("Unable to create payment order ❌", "error");
        return;
      }

      if (!window.Razorpay) {
        notify("Razorpay SDK not loaded ❌", "error");
        return;
      }

      const options = {
        key: "rzp_test_Si5qIO79k0W6vT",
        amount: data.amount,
        currency: "INR",
        order_id: data.id,
        name: "NUTRIBLEND",
        description: "Healthy Order",

        handler: async function () {
          const success = await saveOrder("Online");

          if (success) {
            setPayment("Online");
            notify("Payment successful ✅", "success");
            setPage("success");
          }
        },

        prefill: {
          name: address?.name || "",
          contact: address?.phone || "",
        },

        theme: {
          color: "#7cff6b",
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", function () {
        notify("Payment failed ❌", "error");
      });

      rzp.open();
    } catch (err) {
      console.error("PAYMENT ERROR:", err);
      notify("Something went wrong ❌", "error");
    } finally {
      setLoading(false);
    }
  };

  const goToReview = () => {
    if (!address) {
      notify("Select address first ❌", "error");
      return;
    }

    if (!getCart().length) {
      notify("Cart is empty ❌", "error");
      return;
    }

    setPayment("Review");
    setPage("review");
  };

  const cart = getCart();
  const total = getTotal(cart);

  return (
    <div className="payment-container">
      <div className="payment-card checkout-card">
        <h2>💳 Payment</h2>

        <div className="summary">
          <p>📦 Items: {cart.length} item(s)</p>

          <p>
            📍 Address:{" "}
            {address
              ? `${address.street}, ${address.city} - ${address.pincode}`
              : "Not selected"}
          </p>

          <p>💰 Total: ₹{total}</p>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
          <button
            className="pay-btn"
            onClick={handleCOD}
            disabled={!address || loading}
          >
            {loading ? "Processing..." : "Cash on Delivery"}
          </button>

          <button
            className="pay-btn"
            onClick={handleRazorpay}
            disabled={!address || loading}
          >
            {loading ? "Processing..." : "Pay with Razorpay"}
          </button>
        </div>

        <button className="pay-btn" onClick={goToReview} disabled={loading}>
          Review Order
        </button>
      </div>
    </div>
  );
}