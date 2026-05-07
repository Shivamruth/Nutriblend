import { useState, useEffect } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";
import "../styles/payment.css";

export default function Payment({ setPage, setPayment }) {
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const { notify } = useNotification();

  useEffect(() => {
    const savedAddress = JSON.parse(localStorage.getItem("selectedAddress"));
    setAddress(savedAddress);
  }, []);

  const getCart = () => JSON.parse(localStorage.getItem("cart")) || [];

  const getTotal = (cart) =>
    cart.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1),
      0
    );

  const getTotalItems = (cart) =>
    cart.reduce((sum, item) => sum + Number(item.qty || 1), 0);

  const validateCheckout = async () => {
    if (!address) {
      notify("Please select a delivery address first ❌", "error");
      setPage("address");
      return null;
    }

    const cart = getCart();

    if (!cart.length) {
      notify("Cart is empty ❌", "error");
      setPage("cart");
      return null;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      notify("Please login first ❌", "error");
      setPage("login");
      return null;
    }

    return {
      cart,
      user: userData.user,
      total: getTotal(cart),
    };
  };

  const clearCartAndGoSuccess = (paymentMethod) => {
  localStorage.setItem(
    "lastPaymentMethod",
    paymentMethod === "COD" ? "Cash on Delivery" : "Online Payment"
  );

  localStorage.removeItem("cart");

  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("cartUpdated"));

  setPayment(paymentMethod);
  setPage("success");
};

  // ✅ COD ORDER
  const handleCOD = async () => {
    const checkout = await validateCheckout();
    if (!checkout) return;

    const { cart, user, total } = checkout;

    setLoading(true);

    try {
      let success = false;

      // ✅ Try backend first
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const res = await fetch("/api/create-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            amount: total,
            items: cart,
            address,
            userId: user.id,
            paymentMethod: "COD",
          }),
        });

        const json = await res.json();

        if (res.ok && json.success) {
          success = true;
        } else {
          console.warn("Backend order failed:", json.message);
        }
      } catch (backendErr) {
        console.warn("Backend unavailable, using direct Supabase insert:", backendErr);
      }

      // ✅ Fallback direct Supabase insert
      if (!success) {
        const firstItem = cart[0];

        const { error } = await supabase.from("orders").insert([
          {
            user_id: user.id,
            email: user.email,
            product_name:
              cart.length === 1
                ? firstItem.name || firstItem.product_name || "NutriBlend Order"
                : `${cart.length} items order`,
            price: Number(firstItem.price || 0),
            qty: getTotalItems(cart),
            total,
            items: cart,
            address,
            payment_method: "COD",
            payment_status: "Pending",
            status: "Placed",
          },
        ]);

        if (error) {
          console.error("Supabase insert error:", error);
          notify(error.message || "Failed to place order ❌", "error");
          return;
        }
      }

      notify("Order placed with Cash on Delivery ✅", "success");
      clearCartAndGoSuccess("COD");
    } catch (err) {
      console.error("COD ERROR:", err);
      notify("Something went wrong ❌", "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ RAZORPAY TEST PAYMENT
  const handleRazorpay = async () => {
    const checkout = await validateCheckout();
    if (!checkout) return;

    const { cart, user, total } = checkout;

    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          amount: total,
          items: cart,
          address,
          userId: user.id,
          paymentMethod: "Online",
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        notify(json.message || "Unable to create payment order ❌", "error");
        return;
      }

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
        description: "Healthy Shake Order",

        handler: async function (response) {
          if (!data.db_saved) {
            try {
              const firstItem = cart[0];

              await supabase.from("orders").insert([
                {
                  user_id: user.id,
                  email: user.email,
                  product_name:
                    cart.length === 1
                      ? firstItem.name ||
                        firstItem.product_name ||
                        "NutriBlend Order"
                      : `${cart.length} items order`,
                  price: Number(firstItem.price || 0),
                  qty: getTotalItems(cart),
                  total,
                  items: cart,
                  address,
                  payment_method: "Online",
                  payment_status: "Paid",
                  status: "Placed",
                  razorpay_order_id: data.id,
                  razorpay_payment_id: response.razorpay_payment_id,
                },
              ]);
            } catch (dbErr) {
              console.error("Client-side order save failed:", dbErr);
            }
          }

          notify("Payment successful ✅", "success");
          clearCartAndGoSuccess("Online");
        },

        prefill: {
          name: address?.name || "",
          contact: address?.phone || "",
          email: user.email || "",
        },

        notes: {
          address: `${address.street}, ${address.city}, ${address.state} - ${address.pincode}`,
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

  const cart = getCart();
  const total = getTotal(cart);
  const totalItems = getTotalItems(cart);

  const methods = [
    {
      id: "cod",
      label: "Cash on Delivery",
      icon: "💵",
      desc: "Pay when you receive your order",
      action: handleCOD,
      buttonText: `Place COD Order ₹${total}`,
    },
    {
      id: "razorpay",
      label: "Pay Online",
      icon: "💳",
      desc: "UPI, Cards, Netbanking via Razorpay test mode",
      action: handleRazorpay,
      buttonText: `Pay Online ₹${total}`,
    },
  ];

  const selectedPayment = methods.find((method) => method.id === selectedMethod);

  return (
    <div className="payment-container">
      <div className="payment-card checkout-card">
        <p className="payment-eyebrow">Checkout</p>
        <h2>Choose Payment</h2>

        {!address && (
          <div className="payment-warning-box">
            <strong>No delivery address selected</strong>
            <p>Please select your delivery address before placing order.</p>
            <button type="button" onClick={() => setPage("address")}>
              Select Address
            </button>
          </div>
        )}

        {address && (
          <div className="payment-address-card">
            <div className="payment-address-header">
              <div>
                <p className="payment-address-label">Delivering To</p>
                <h3>
                  {address.name}{" "}
                  {address.type && <span>• {address.type}</span>}
                </h3>
              </div>

              <button
                type="button"
                className="change-address-btn"
                onClick={() => setPage("address")}
                disabled={loading}
              >
                Change
              </button>
            </div>

            <p className="payment-address-text">
              {address.street}, {address.city}, {address.state} -{" "}
              {address.pincode}
            </p>
            <p className="payment-address-phone">📞 {address.phone}</p>
          </div>
        )}

        <div className="summary">
          <div className="payment-summary-row">
            <span>📦 Items</span>
            <span>
              {cart.length} product{cart.length !== 1 ? "s" : ""} • {totalItems} qty
            </span>
          </div>

          <div className="payment-summary-row">
            <span>📍 Delivery City</span>
            <span>{address ? address.city : "Not selected"}</span>
          </div>

          <div className="payment-summary-row">
            <span>🚚 Delivery Fee</span>
            <span>Free</span>
          </div>

          <div className="payment-summary-divider" />

          <div className="payment-summary-row payment-summary-total">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
        </div>

        <div className="payment-cart-preview">
          <h3>Order Items</h3>

          {cart.length === 0 ? (
            <p className="payment-empty-cart">Your cart is empty.</p>
          ) : (
            <div className="payment-items-list">
              {cart.map((item, index) => (
                <div className="payment-item" key={item.id || index}>
                  <div>
                    <strong>{item.name || item.product_name || "NutriBlend Item"}</strong>
                    <p>Qty: {item.qty || 1}</p>
                  </div>

                  <span>
                    ₹{Number(item.price || 0) * Number(item.qty || 1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="payment-methods">
          {methods.map((method) => (
            <button
              key={method.id}
              className={`payment-method-card ${
                selectedMethod === method.id ? "payment-method-active" : ""
              }`}
              onClick={() => setSelectedMethod(method.id)}
              disabled={loading}
              type="button"
            >
              <span className="payment-method-icon">{method.icon}</span>

              <div className="payment-method-info">
                <span className="payment-method-label">{method.label}</span>
                <span className="payment-method-desc">{method.desc}</span>
              </div>

              <div
                className={`payment-radio ${
                  selectedMethod === method.id ? "payment-radio-active" : ""
                }`}
              />
            </button>
          ))}
        </div>

        <button
          className="pay-btn"
          onClick={() => {
            if (selectedPayment) {
              selectedPayment.action();
            } else {
              notify("Select a payment method", "error");
            }
          }}
          disabled={!selectedMethod || !address || loading || cart.length === 0}
        >
          {loading
            ? "Processing..."
            : selectedPayment
            ? selectedPayment.buttonText
            : `Continue ₹${total}`}
        </button>

        <button
          className="payment-back-btn"
          onClick={() => setPage("address")}
          disabled={loading}
          type="button"
        >
          ← Back to Address
        </button>
      </div>
    </div>
  );
}