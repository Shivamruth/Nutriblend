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


  const handleCOD = async () => {
    setLoading(true);

    try {
      const cart = getCart();
      const total = getTotal(cart);
      const { data: userData } = await supabase.auth.getUser();

      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: total,
          items: cart,
          address,
          userId: userData.user.id,
          paymentMethod: "COD"
        }),
      });

      const json = await res.json();

      if (json.success) {
        localStorage.removeItem("cart");
        window.dispatchEvent(new Event("storage"));
        
        setPayment("COD");
        notify("Order placed with COD ✅", "success");
        setPage("success");
      } else {
        notify(json.message || "Order failed ❌", "error");
      }
    } catch (err) {
      console.error("COD ERROR:", err);
      notify("Something went wrong ❌", "error");
    } finally {
      setLoading(false);
    }
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

      const { data: userData } = await supabase.auth.getUser();

      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: total,
          items: cart,
          address,
          userId: userData.user.id,
          paymentMethod: "Online"
        }),
      });

      const json = await res.json();
      const data = json.data;

      if (!data || !data.id) {
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
          // Note: The backend webhook will handle updating the order status securely.
          // We just clear the cart and show the success page here.
          localStorage.removeItem("cart");
          window.dispatchEvent(new Event("storage"));
          
          setPayment("Online");
          notify("Payment successful ✅", "success");
          setPage("success");
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