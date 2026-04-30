import { useState, useEffect } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";

export default function Payment({ setPage, setPayment }) {
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const { notify } = useNotification();

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("selectedAddress"));
    setAddress(saved);
  }, []);

  const getCart = () => JSON.parse(localStorage.getItem("cart")) || [];
  const getTotal = (cart) => cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);

  // ✅ COD: Insert directly via Supabase (works with anon key + RLS)
  const handleCOD = async () => {
    if (!address) { notify("Select address first ❌", "error"); return; }
    const cart = getCart();
    if (!cart.length) { notify("Cart is empty ❌", "error"); return; }

    setLoading(true);
    try {
      const total = getTotal(cart);
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        notify("Please login first ❌", "error");
        setLoading(false);
        return;
      }

      // Try backend first
      let success = false;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/create-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            amount: total,
            items: cart,
            address,
            userId: userData.user.id,
            paymentMethod: "COD",
          }),
        });
        const json = await res.json();
        success = json.success;
      } catch (backendErr) {
        console.warn("Backend unavailable, using direct insert:", backendErr);
      }

      // Fallback: insert directly via Supabase if backend fails
      if (!success) {
        const { error } = await supabase.from("orders").insert([{
          user_id: userData.user.id,
          items: cart,
          address,
          payment_method: "COD",
          total,
          status: "placed",
        }]);

        if (error) {
          console.error("Supabase insert error:", error);
          notify(error.message || "Failed to place order ❌", "error");
          setLoading(false);
          return;
        }
      }

      localStorage.removeItem("cart");
      window.dispatchEvent(new Event("storage"));
      setPayment("COD");
      notify("Order placed with COD ✅", "success");
      setPage("success");
    } catch (err) {
      console.error("COD ERROR:", err);
      notify("Something went wrong ❌", "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ RAZORPAY: Needs backend for order creation
  const handleRazorpay = async () => {
    if (!address) { notify("Select address first ❌", "error"); return; }
    const cart = getCart();
    if (!cart.length) { notify("Cart is empty ❌", "error"); return; }

    try {
      setLoading(true);
      const total = getTotal(cart);
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        notify("Please login first ❌", "error");
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          amount: total,
          items: cart,
          address,
          userId: userData.user.id,
          paymentMethod: "Online",
        }),
      });

      const json = await res.json();

      if (!json.success) {
        notify(json.message || "Unable to create payment order ❌", "error");
        setLoading(false);
        return;
      }

      const data = json.data;
      if (!data || !data.id) {
        notify("Unable to create payment order ❌", "error");
        setLoading(false);
        return;
      }

      if (!window.Razorpay) {
        notify("Razorpay SDK not loaded ❌", "error");
        setLoading(false);
        return;
      }

      const options = {
        key: "rzp_test_Si5qIO79k0W6vT",
        amount: data.amount,
        currency: "INR",
        order_id: data.id,
        name: "NUTRIBLEND",
        description: "Healthy Order",
        handler: async function (response) {
          // Save order to Supabase directly if backend didn't save it
          if (!data.db_saved) {
            try {
              await supabase.from("orders").insert([{
                user_id: userData.user.id,
                items: cart,
                address,
                payment_method: "Online",
                total,
                status: "placed",
                razorpay_order_id: data.id,
                razorpay_payment_id: response.razorpay_payment_id,
              }]);
            } catch (dbErr) {
              console.error("Client-side order save failed:", dbErr);
            }
          }

          localStorage.removeItem("cart");
          window.dispatchEvent(new Event("storage"));
          setPayment("Online");
          notify("Payment successful ✅", "success");
          setPage("success");
        },
        prefill: { name: address?.name || "", contact: address?.phone || "" },
        theme: { color: "#7cff6b" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function () { notify("Payment failed ❌", "error"); });
      rzp.open();
    } catch (err) {
      console.error("PAYMENT ERROR:", err);
      notify("Something went wrong ❌", "error");
    } finally {
      setLoading(false);
    }
  };

  const cart = getCart();
  const total = getTotal(cart);

  const methods = [
    { id: "cod", label: "Cash on Delivery", icon: "💵", desc: "Pay when you receive your order", action: handleCOD },
    { id: "razorpay", label: "Pay Online", icon: "💳", desc: "UPI, Cards, Netbanking via Razorpay", action: handleRazorpay },
  ];

  return (
    <div className="payment-container">
      <div className="payment-card checkout-card">
        <p className="payment-eyebrow">Checkout</p>
        <h2>Choose Payment</h2>

        <div className="summary">
          <div className="payment-summary-row">
            <span>📦 Items</span>
            <span>{cart.length} item{cart.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="payment-summary-row">
            <span>📍 Delivery</span>
            <span>{address ? `${address.city}` : "Not selected"}</span>
          </div>
          <div className="payment-summary-divider" />
          <div className="payment-summary-row payment-summary-total">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
        </div>

        <div className="payment-methods">
          {methods.map((m) => (
            <button
              key={m.id}
              className={`payment-method-card ${selectedMethod === m.id ? "payment-method-active" : ""}`}
              onClick={() => setSelectedMethod(m.id)}
              disabled={loading}
            >
              <span className="payment-method-icon">{m.icon}</span>
              <div className="payment-method-info">
                <span className="payment-method-label">{m.label}</span>
                <span className="payment-method-desc">{m.desc}</span>
              </div>
              <div className={`payment-radio ${selectedMethod === m.id ? "payment-radio-active" : ""}`} />
            </button>
          ))}
        </div>

        <button
          className="pay-btn"
          onClick={() => {
            const method = methods.find((m) => m.id === selectedMethod);
            if (method) method.action();
            else notify("Select a payment method", "error");
          }}
          disabled={!selectedMethod || !address || loading}
        >
          {loading ? "Processing..." : `Pay ₹${total}`}
        </button>

        <button
          className="payment-back-btn"
          onClick={() => setPage("address")}
          disabled={loading}
        >
          ← Back to Address
        </button>
      </div>
    </div>
  );
}