import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";
import "../styles/payment.css";

const DELIVERY_OPTIONS = [
  {
    id: "standard",
    title: "Standard Delivery",
    desc: "Freshly prepared and delivered safely",
    fee: 0,
    eta: "Today / Tomorrow",
  },
  {
    id: "priority",
    title: "Priority Delivery",
    desc: "Faster delivery when available",
    fee: 29,
    eta: "Fastest available",
  },
];

const PAYMENT_METHODS = [
  {
    id: "cod",
    label: "Cash on Delivery / Pay on Delivery",
    shortLabel: "Cash on Delivery",
    icon: "💵",
    desc: "Cash, UPI or card accepted at delivery time",
  },
  {
    id: "razorpay",
    label: "UPI / Cards / Netbanking",
    shortLabel: "Online Payment",
    icon: "💳",
    desc: "Pay securely online using Razorpay test mode",
  },
];

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const normalizeStockStatus = (status) => {
  const value = String(status || "In Stock")
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim();

  if (value === "out of stock") return "Out of Stock";
  if (value === "limited stock") return "Limited Stock";

  return "In Stock";
};

const formatAddressLine = (address) => {
  if (!address) return "No address selected";

  return [
    address.street,
    address.landmark ? `Near ${address.landmark}` : "",
    address.city,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(", ");
};

export default function Payment({ setPage, setPayment }) {
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [deliveryOption, setDeliveryOption] = useState("standard");
  const [deliveryInstruction, setDeliveryInstruction] = useState("");
  const [showInstructionBox, setShowInstructionBox] = useState(false);
  const [addressLoading, setAddressLoading] = useState(true);
  const [paymentStage, setPaymentStage] = useState("");

  const { notify } = useNotification();

  useEffect(() => {
    loadSelectedAddress();
  }, []);

  const loadSelectedAddress = async () => {
    setAddressLoading(true);

    try {
      const localAddress = JSON.parse(localStorage.getItem("selectedAddress"));
      const selectedAddressId = localStorage.getItem("selectedAddressId");

      if (localAddress) {
        setAddress(localAddress);
      }

      if (!selectedAddressId) {
        setAddressLoading(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setAddressLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("id", selectedAddressId)
        .eq("user_id", userData.user.id)
        .single();

      if (error) {
        console.warn("Selected address fetch error:", error);
        setAddressLoading(false);
        return;
      }

      const normalizedAddress = {
        id: data.id,
        user_id: data.user_id,
        name: data.name,
        phone: data.phone,
        street: data.street,
        landmark: data.landmark,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        type: data.type,
        isDefault: data.is_default,
      };

      setAddress(normalizedAddress);
      localStorage.setItem("selectedAddress", JSON.stringify(normalizedAddress));
    } catch (error) {
      console.error("Load selected address error:", error);
    } finally {
      setAddressLoading(false);
    }
  };

  const getCart = () => JSON.parse(localStorage.getItem("cart")) || [];

  const getSubtotal = (cart) =>
    cart.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1),
      0
    );

  const getTotalItems = (cart) =>
    cart.reduce((sum, item) => sum + Number(item.qty || 1), 0);

  const selectedDelivery = useMemo(
    () =>
      DELIVERY_OPTIONS.find((option) => option.id === deliveryOption) ||
      DELIVERY_OPTIONS[0],
    [deliveryOption]
  );

  const cart = getCart();
  const subtotal = getSubtotal(cart);
  const deliveryFee = Number(selectedDelivery.fee || 0);
  const total = subtotal + deliveryFee;
  const totalItems = getTotalItems(cart);

  const parseApiResponse = async (res) => {
    const text = await res.text();

    try {
      return JSON.parse(text);
    } catch {
      console.error("Non-JSON API response:", text);
      throw new Error(text || "Server returned non-JSON response");
    }
  };

  const extractOrderId = (json) => {
    return (
      json?.orderId ||
      json?.order_id ||
      json?.data?.orderId ||
      json?.data?.order_id ||
      json?.data?.db_order_id ||
      json?.data?.dbOrderId ||
      json?.data?.order?.id ||
      json?.data?.savedOrder?.id ||
      json?.data?.saved_order?.id ||
      ""
    );
  };

  const fetchLatestOrderId = async (userId) => {
    const { data, error } = await supabase
      .from("orders")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.warn("Could not fetch latest order ID:", error);
      return "";
    }

    return data?.id || "";
  };

  const syncCartWithLiveProducts = async (cartItems) => {
    const productIds = cartItems
      .filter((item) => !item.isPlan && item.id)
      .map((item) => item.id);

    if (productIds.length === 0) {
      return {
        valid: true,
        cart: cartItems,
        subtotal: getSubtotal(cartItems),
        priceChanged: false,
      };
    }

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, protein, price, category, image, description, stock_status, is_active, calories, quantity, benefits, ingredients"
      )
      .in("id", productIds);

    if (error) {
      console.error("Final checkout product sync error:", error);
      notify("Unable to verify product availability ❌", "error");
      return null;
    }

    const liveProductMap = new Map(
      (data || []).map((product) => [product.id, product])
    );

    let hasUnavailable = false;
    let priceChanged = false;

    const syncedCart = cartItems.map((item) => {
      if (item.isPlan) return item;

      const liveProduct = liveProductMap.get(item.id);

      if (!liveProduct) {
        hasUnavailable = true;

        return {
          ...item,
          stock_status: "Out of Stock",
          is_active: false,
          sync_warning: "Product no longer exists",
        };
      }

      const latestStock = normalizeStockStatus(liveProduct.stock_status);
      const latestActive = liveProduct.is_active !== false;
      const oldPrice = Number(item.price || 0);
      const latestPrice = Number(liveProduct.price || 0);

      if (!latestActive || latestStock === "Out of Stock") {
        hasUnavailable = true;
      }

      if (oldPrice !== latestPrice) {
        priceChanged = true;
      }

      return {
        ...item,
        name: liveProduct.name || item.name,
        product_name: liveProduct.name || item.product_name || item.name,
        protein: liveProduct.protein || item.protein,
        price: latestPrice,
        category: liveProduct.category || item.category,
        image: liveProduct.image || item.image,
        description: liveProduct.description || item.description,
        stock_status: latestStock,
        is_active: latestActive,
        calories: liveProduct.calories || item.calories,
        quantity: liveProduct.quantity || item.quantity,
        benefits: liveProduct.benefits || item.benefits,
        ingredients: liveProduct.ingredients || item.ingredients,
        price_changed: oldPrice !== latestPrice,
        old_price: oldPrice !== latestPrice ? oldPrice : item.old_price || null,
      };
    });

    localStorage.setItem("cart", JSON.stringify(syncedCart));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("cartUpdated"));

    if (hasUnavailable) {
      notify(
        "Some cart items are now unavailable. Please review your cart ❌",
        "error"
      );
      setPage("cart");

      return {
        valid: false,
        cart: syncedCart,
        subtotal: getSubtotal(syncedCart),
        priceChanged,
      };
    }

    if (priceChanged) {
      notify("Cart prices were updated with latest product prices ✅", "success");
    }

    return {
      valid: true,
      cart: syncedCart,
      subtotal: getSubtotal(syncedCart),
      priceChanged,
    };
  };

  const validateCheckout = async () => {
    const cartItems = getCart();

    if (!address) {
      notify("Please select a delivery address first ❌", "error");
      setPage("address");
      return null;
    }

    if (!selectedMethod) {
      notify("Please select a payment method ❌", "error");
      return null;
    }

    if (!cartItems.length) {
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

    const synced = await syncCartWithLiveProducts(cartItems);

    if (!synced || !synced.valid) {
      return null;
    }

    const finalDeliveryFee = Number(selectedDelivery.fee || 0);
    const finalTotal = synced.subtotal + finalDeliveryFee;

    return {
      cart: synced.cart,
      user: userData.user,
      subtotal: synced.subtotal,
      deliveryFee: finalDeliveryFee,
      total: finalTotal,
    };
  };

  const clearCartAndGoSuccess = (paymentMethod, orderId = "") => {
    localStorage.setItem(
      "lastPaymentMethod",
      paymentMethod === "COD" ? "Cash on Delivery" : "Online Payment"
    );

    if (orderId) {
      localStorage.setItem("lastOrderId", String(orderId).slice(-8));
      localStorage.setItem("lastFullOrderId", String(orderId));
    } else {
      localStorage.removeItem("lastOrderId");
      localStorage.removeItem("lastFullOrderId");
    }

    localStorage.removeItem("cart");

    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("cartUpdated"));

    setPayment(paymentMethod);
    setPage("success");
  };

  const buildOrderAddressSnapshot = () => ({
    id: address?.id || null,
    name: address?.name || "",
    phone: address?.phone || "",
    street: address?.street || "",
    landmark: address?.landmark || "",
    city: address?.city || "",
    state: address?.state || "",
    pincode: address?.pincode || "",
    type: address?.type || "Address",
    delivery_instruction: deliveryInstruction.trim(),
  });

  const saveOrderDirectlyToSupabase = async ({
    cart,
    user,
    subtotal,
    deliveryFee,
    total,
    paymentMethod,
    paymentStatus,
    razorpayOrderId = null,
    razorpayPaymentId = null,
  }) => {
    const firstItem = cart[0];

    const payload = {
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
      address: buildOrderAddressSnapshot(),
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      status: "Placed",
      delivery_fee: deliveryFee,
      subtotal,
      delivery_option: selectedDelivery.title,
    };

    if (razorpayOrderId) {
      payload.razorpay_order_id = razorpayOrderId;
    }

    if (razorpayPaymentId) {
      payload.razorpay_payment_id = razorpayPaymentId;
    }

    const { data, error } = await supabase
      .from("orders")
      .insert([payload])
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    return data?.id || "";
  };

  const placeCODOrder = async () => {
    if (loading) return;

    const checkout = await validateCheckout();
    if (!checkout) return;

    const { cart, user, subtotal, deliveryFee, total } = checkout;

    setLoading(true);
    setPaymentStage("Placing your COD order...");

    try {
      let success = false;
      let orderId = "";

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error("Session expired. Please login again.");
        }

        const res = await fetch("/api/create-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            amount: total,
            subtotal,
            deliveryFee,
            items: cart,
            address: buildOrderAddressSnapshot(),
            userId: user.id,
            paymentMethod: "COD",
            deliveryOption: selectedDelivery.title,
          }),
        });

        const json = await parseApiResponse(res);

        if (res.ok && json.success) {
          success = true;
          orderId = extractOrderId(json);

          if (!orderId) {
            orderId = await fetchLatestOrderId(user.id);
          }
        } else {
          console.warn("Backend order failed:", json.message);
        }
      } catch (backendErr) {
        console.warn(
          "Backend unavailable, using direct Supabase insert:",
          backendErr
        );
      }

      if (!success || !orderId) {
        orderId = await saveOrderDirectlyToSupabase({
          cart,
          user,
          subtotal,
          deliveryFee,
          total,
          paymentMethod: "COD",
          paymentStatus: "Pending",
        });
      }

      notify("Order placed with Cash on Delivery ✅", "success");
      clearCartAndGoSuccess("COD", orderId);
    } catch (err) {
      console.error("COD ERROR:", err);
      notify(err.message || "Something went wrong ❌", "error");
    } finally {
      setLoading(false);
      setPaymentStage("");
    }
  };

  const placeOnlineOrder = async () => {
    if (loading) return;

    const checkout = await validateCheckout();
    if (!checkout) return;

    const { cart, user, subtotal, deliveryFee, total } = checkout;
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

    if (!razorpayKey) {
      notify("Razorpay key is missing. Add VITE_RAZORPAY_KEY_ID ❌", "error");
      return;
    }

    try {
      setLoading(true);
      setPaymentStage("Creating secure payment order...");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        notify("Session expired. Please login again ❌", "error");
        setPage("login");
        return;
      }

      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount: total,
          subtotal,
          deliveryFee,
          items: cart,
          address: buildOrderAddressSnapshot(),
          userId: user.id,
          paymentMethod: "Online",
          deliveryOption: selectedDelivery.title,
        }),
      });

      const json = await parseApiResponse(res);

      if (!res.ok || !json.success) {
        notify(json.message || "Unable to create payment order ❌", "error");
        return;
      }

      const data = json.data;
      let savedOrderId = extractOrderId(json);

      if (!savedOrderId && json?.data?.db_saved) {
        savedOrderId = await fetchLatestOrderId(user.id);
      }

      if (!data || !data.id) {
        notify("Unable to create Razorpay order ❌", "error");
        return;
      }

      if (!window.Razorpay) {
        notify("Razorpay SDK not loaded ❌", "error");
        return;
      }

      setPaymentStage("Opening Razorpay checkout...");

      const options = {
        key: razorpayKey,
        amount: data.amount,
        currency: data.currency || "INR",
        order_id: data.id,
        name: "NUTRIBLEND",
        description: "Healthy Protein Order",

        handler: async function (response) {
          try {
            setPaymentStage("Verifying payment securely...");

            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                orderId: savedOrderId || null,
              }),
            });

            const verifyJson = await parseApiResponse(verifyRes);

            if (!verifyRes.ok || !verifyJson.success) {
              notify(
                verifyJson.message || "Payment verification failed ❌",
                "error"
              );
              return;
            }

            savedOrderId = savedOrderId || verifyJson.orderId || "";

            if (!data.db_saved) {
              setPaymentStage("Saving your order...");

              savedOrderId = await saveOrderDirectlyToSupabase({
                cart,
                user,
                subtotal,
                deliveryFee,
                total,
                paymentMethod: "Online",
                paymentStatus: "Paid",
                razorpayOrderId: data.id,
                razorpayPaymentId: response.razorpay_payment_id,
              });
            }

            notify("Payment verified successfully ✅", "success");
            clearCartAndGoSuccess("Online", savedOrderId);
          } catch (verifyErr) {
            console.error("Payment verification failed:", verifyErr);
            notify("Payment verification failed ❌", "error");
          } finally {
            setLoading(false);
            setPaymentStage("");
          }
        },

        prefill: {
          name: address?.name || "",
          contact: address?.phone || "",
          email: user.email || "",
        },

        notes: {
          address: formatAddressLine(address),
          delivery_instruction: deliveryInstruction.trim(),
        },

        theme: {
          color: "#7cff6b",
        },

        modal: {
          ondismiss: function () {
            notify("Payment cancelled by user", "error");
            setLoading(false);
            setPaymentStage("");
          },
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", function (response) {
        console.error("Razorpay payment failed:", response.error);
        notify(response?.error?.description || "Payment failed ❌", "error");
        setLoading(false);
        setPaymentStage("");
      });

      rzp.open();
    } catch (err) {
      console.error("PAYMENT ERROR:", err);
      notify(err.message || "Something went wrong ❌", "error");
      setLoading(false);
      setPaymentStage("");
    }
  };

  const placeOrder = () => {
    if (loading) return;

    if (selectedMethod === "cod") {
      placeCODOrder();
      return;
    }

    if (selectedMethod === "razorpay") {
      placeOnlineOrder();
      return;
    }

    notify("Select a payment method", "error");
  };

  const selectedPayment = PAYMENT_METHODS.find(
    (method) => method.id === selectedMethod
  );

  return (
    <div className="payment-page">
      <div className="payment-main">
        <section className="checkout-block">
          <div className="checkout-block-head">
            <div>
              <p className="payment-eyebrow">Step 1</p>
              <h3>Delivering to {address?.name || "Customer"}</h3>
            </div>

            <button onClick={() => setPage("address")} disabled={loading}>
              Change
            </button>
          </div>

          {addressLoading ? (
            <p className="payment-muted">Loading selected address...</p>
          ) : address ? (
            <>
              <p className="checkout-address-line">
                {formatAddressLine(address)}
              </p>
              <p className="checkout-address-phone">📞 {address.phone}</p>

              {!showInstructionBox ? (
                <button
                  className="delivery-instruction-link"
                  onClick={() => setShowInstructionBox(true)}
                  type="button"
                  disabled={loading}
                >
                  Add delivery instructions
                </button>
              ) : (
                <div className="delivery-instruction-box">
                  <textarea
                    placeholder="Example: Call before delivery, deliver near gym reception, hostel room number..."
                    value={deliveryInstruction}
                    onChange={(e) => setDeliveryInstruction(e.target.value)}
                    rows="3"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    onClick={() => setShowInstructionBox(false)}
                    disabled={loading}
                  >
                    Save instructions
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="payment-warning-box">
              <strong>No delivery address selected</strong>
              <p>Please select your delivery address before placing order.</p>
              <button type="button" onClick={() => setPage("address")}>
                Select Address
              </button>
            </div>
          )}
        </section>

        <section className="checkout-block">
          <div className="checkout-block-head">
            <div>
              <p className="payment-eyebrow">Step 2</p>
              <h3>Payment method</h3>
            </div>
          </div>

          <div className="payment-method-list">
            {PAYMENT_METHODS.map((method) => (
              <label
                key={method.id}
                className={`payment-method-row ${
                  selectedMethod === method.id ? "selected" : ""
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={selectedMethod === method.id}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  disabled={loading}
                />

                <span className="payment-method-icon">{method.icon}</span>

                <div>
                  <strong>{method.label}</strong>
                  <p>{method.desc}</p>
                </div>
              </label>
            ))}
          </div>

          <button
            className="use-payment-btn"
            onClick={() => {
              if (!selectedMethod) {
                notify("Select a payment method", "error");
                return;
              }

              notify("Payment method selected ✅", "success");
            }}
            disabled={!selectedMethod || loading}
          >
            Use this payment method
          </button>
        </section>

        <section className="checkout-alert">
          <span>⚠️</span>
          <div>
            <strong>One-time password may be required at time of delivery</strong>
            <p>
              Please ensure someone is available to receive the delivery. For gym
              or hostel delivery, mention clear instructions.
            </p>
          </div>
        </section>

        <section className="checkout-block">
          <div className="checkout-block-head">
            <div>
              <p className="payment-eyebrow">Step 3</p>
              <h3>Review items and delivery</h3>
            </div>
          </div>

          <div className="delivery-options">
            {DELIVERY_OPTIONS.map((option) => (
              <label
                key={option.id}
                className={`delivery-option ${
                  deliveryOption === option.id ? "selected" : ""
                }`}
              >
                <input
                  type="radio"
                  name="deliveryOption"
                  value={option.id}
                  checked={deliveryOption === option.id}
                  onChange={(e) => setDeliveryOption(e.target.value)}
                  disabled={loading}
                />

                <div>
                  <strong>{option.title}</strong>
                  <p>
                    {option.eta} •{" "}
                    {option.fee === 0 ? "FREE Delivery" : money(option.fee)}
                  </p>
                  <small>{option.desc}</small>
                </div>
              </label>
            ))}
          </div>

          <div className="payment-items-list">
            {cart.length === 0 ? (
              <div className="payment-empty-cart">
                <p>Your cart is empty.</p>
                <button onClick={() => setPage("home")}>Start Shopping</button>
              </div>
            ) : (
              cart.map((item, index) => (
                <div className="payment-item" key={item.id || index}>
                  <div className="payment-item-thumb">
                    {item.image ? (
                      <img src={item.image} alt={item.name || "Item"} />
                    ) : (
                      <span>{item.isPlan ? "📅" : "🥤"}</span>
                    )}
                  </div>

                  <div className="payment-item-main">
                    <strong>
                      {item.name || item.product_name || "NutriBlend Item"}
                    </strong>

                    <p>
                      Qty: {item.qty || 1}
                      {item.protein ? ` • ${item.protein} protein` : ""}
                    </p>

                    {item.category && <small>{item.category}</small>}

                    {item.price_changed && (
                      <em>
                        Price updated from {money(item.old_price)} to{" "}
                        {money(item.price)}
                      </em>
                    )}
                  </div>

                  <span className="payment-item-price">
                    {money(Number(item.price || 0) * Number(item.qty || 1))}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="checkout-place-bottom">
          <button
            className="place-order-btn"
            onClick={placeOrder}
            disabled={!selectedMethod || !address || loading || cart.length === 0}
          >
            {loading
              ? paymentStage || "Processing..."
              : selectedMethod === "cod"
              ? "Place your order"
              : "Pay and place your order"}
          </button>

          <div>
            <strong>Order Total: {money(total)}</strong>
            <p>
              By placing your order, you agree to NutriBlend order confirmation
              and delivery process.
            </p>

            {paymentStage && (
              <p className="payment-processing-text">{paymentStage}</p>
            )}
          </div>
        </section>
      </div>

      <aside className="payment-sidebar">
        <button
          className="place-order-btn"
          onClick={placeOrder}
          disabled={!selectedMethod || !address || loading || cart.length === 0}
        >
          {loading
            ? paymentStage || "Processing..."
            : selectedMethod === "cod"
            ? "Place your order"
            : "Pay and place your order"}
        </button>

        {paymentStage && (
          <p className="payment-processing-text">{paymentStage}</p>
        )}

        <p className="payment-agreement">
          By placing your order, your selected address and payment method will be
          saved with this order.
        </p>

        <div className="sidebar-divider" />

        <div className="summary-line">
          <span>Items ({totalItems})</span>
          <strong>{money(subtotal)}</strong>
        </div>

        <div className="summary-line">
          <span>Delivery</span>
          <strong>{deliveryFee === 0 ? "FREE" : money(deliveryFee)}</strong>
        </div>

        <div className="summary-line">
          <span>Payment</span>
          <strong>{selectedPayment?.shortLabel || "--"}</strong>
        </div>

        <div className="summary-line saving-line">
          <span>NutriBlend Saving</span>
          <strong>-{money(deliveryFee === 0 ? 40 : 0)}</strong>
        </div>

        <div className="sidebar-divider" />

        <div className="summary-total">
          <span>Order Total</span>
          <strong>{money(total)}</strong>
        </div>
      </aside>
    </div>
  );
}