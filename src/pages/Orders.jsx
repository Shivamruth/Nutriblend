import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";
import "./Orders.css";

const ORDER_STEPS = [
  "Pending",
  "Preparing",
  "Ready for Pickup",
  "Out for Delivery",
  "Delivered",
];
const STATUS_FILTERS = ["All", ...ORDER_STEPS, "Cancelled"];

const money = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

const formatOrderId = (id) => {
  if (!id) return "NB-000000";
  const value = String(id);
  if (/^\d+$/.test(value)) return `NB-${value.padStart(6, "0")}`;
  return `NB-${value.slice(-8).toUpperCase()}`;
};

const normalizeStatus = (status) => {
  const value = String(status || "Pending")
    .toLowerCase()
    .replaceAll("_", " ")
    .trim();

  if (value === "placed" || value === "pending") return "Pending";
  if (value === "preparing") return "Preparing";
  if (value === "ready for pickup" || value === "ready") return "Ready for Pickup";
  if (value === "out for delivery") return "Out for Delivery";
  if (value === "delivered") return "Delivered";
  if (value === "cancelled" || value === "canceled") return "Cancelled";

  return "Pending";
};

const normalizePaymentMethod = (method) => {
  const value = String(method || "COD").trim();
  if (!value) return "COD";
  if (value.toLowerCase() === "online") return "Razorpay";
  return value;
};

const normalizePaymentStatus = (status) =>
  String(status || "Pending").trim() || "Pending";

const formatDateTime = (dateValue) => {
  if (!dateValue) return "N/A";
  return new Date(dateValue).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const safeObject = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (!value || typeof value !== "string") return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
};

const getOrderItems = (order) => {
  const items = safeArray(order.items);
  if (items.length) return items;

  return [
    {
      id: order.id,
      name: order.product_name || "NutriBlend Order",
      price: Number(order.price || order.total || 0),
      qty: Number(order.qty || 1),
    },
  ];
};

const getItemName = (item) =>
  item.name || item.product_name || item.title || "NutriBlend Item";

const getItemPrice = (item) => Number(item.price || item.amount || 0);
const getItemQty = (item) => Number(item.qty || item.quantity || 1);
const getItemSubtotal = (item) => getItemPrice(item) * getItemQty(item);
const getOrderTotal = (order) => Number(order.total || order.price || 0);

const getAddressText = (address) =>
  [
    address.name,
    address.phone,
    address.street,
    address.city,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(", ");

const getStatusClass = (status) =>
  `orders-status-badge status-${normalizeStatus(status)
    .toLowerCase()
    .replaceAll(" ", "-")}`;

const getPaymentStatusClass = (status) =>
  `orders-payment-status payment-${normalizePaymentStatus(status)
    .toLowerCase()
    .replaceAll(" ", "-")}`;

export default function Orders({ setPage }) {
  const { notify } = useNotification();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const fetchOrders = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setOrders([]);
          setErrorMessage("Please login again to view your orders.");
          return;
        }

        const { data, error } = await supabase
          .from("orders")
          .select(
            "id, product_name, price, created_at, user_id, email, qty, total, payment_status, payment_method, upi_id, status, address, items"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setOrders(data || []);
      } catch (error) {
        console.error("Orders fetch error:", error);
        setOrders([]);
        setErrorMessage(error.message || "Unable to fetch your orders.");
        notify(error.message || "Unable to fetch your orders", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [notify]
  );

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const address = safeObject(order.address);
      const items = getOrderItems(order);
      const status = normalizeStatus(order.status);
      const paymentMethod = normalizePaymentMethod(order.payment_method);
      const paymentStatus = normalizePaymentStatus(order.payment_status);

      const searchable = [
        formatOrderId(order.id),
        order.id,
        order.product_name,
        order.email,
        order.upi_id,
        status,
        paymentMethod,
        paymentStatus,
        getAddressText(address),
        ...items.map(getItemName),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchable.includes(query);
      const matchesStatus = statusFilter === "All" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const getStatusStep = (status) => {
    const normalized = normalizeStatus(status);
    if (normalized === "Cancelled") return -1;
    return Math.max(0, ORDER_STEPS.indexOf(normalized));
  };

  const handleTrackOrder = (order) => {
    localStorage.setItem("trackOrderId", String(order.id));
    setPage?.("track-order", { orderId: order.id });
  };

  const handleOrderAgain = (order) => {
    const items = getOrderItems(order);
    const existingCart = JSON.parse(localStorage.getItem("cart")) || [];
    const nextCart = [...existingCart];

    items.forEach((item) => {
      const itemName = getItemName(item);
      const itemId = item.id || item.product_id || itemName;
      const existing = nextCart.find(
        (cartItem) =>
          cartItem.id === itemId ||
          cartItem.name === itemName ||
          cartItem.product_name === itemName
      );

      if (existing) {
        existing.qty = Number(existing.qty || 1) + getItemQty(item);
      } else {
        nextCart.push({
          ...item,
          id: itemId,
          name: itemName,
          product_name: itemName,
          qty: getItemQty(item),
          price: getItemPrice(item),
        });
      }
    });

    localStorage.setItem("cart", JSON.stringify(nextCart));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("cartUpdated"));
    notify("Order items added to cart", "success");
    setPage?.("cart");
  };

  const handleContactSupport = (order) => {
    const message = encodeURIComponent(
      `Hi NutriBlend, I need help with order ${formatOrderId(order.id)}.`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <main className="orders-page">
        <OrdersHero
          orderCount={0}
          refreshing={false}
          onRefresh={() => fetchOrders({ silent: true })}
        />

        <section className="orders-loading" aria-label="Loading orders">
          {[1, 2, 3].map((item) => (
            <div className="orders-skeleton-card" key={item}>
              <div className="orders-skeleton-line wide" />
              <div className="orders-skeleton-line" />
              <div className="orders-skeleton-line short" />
            </div>
          ))}
        </section>
      </main>
    );
  }

  return (
    <main className="orders-page">
      <OrdersHero
        orderCount={orders.length}
        refreshing={refreshing}
        onRefresh={() => fetchOrders({ silent: true })}
      />

      {orders.length > 0 && (
        <section className="orders-toolbar" aria-label="Orders filters">
          <input
            type="search"
            placeholder="Search order ID, item, address, payment..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status === "All" ? "All Status" : status}
              </option>
            ))}
          </select>
        </section>
      )}

      {errorMessage ? (
        <OrdersState
          title="Unable to load orders"
          message={errorMessage}
          actionLabel="Try Again"
          onAction={() => fetchOrders()}
        />
      ) : orders.length === 0 ? (
        <OrdersState
          title="No orders yet"
          message="Your past and current NutriBlend orders will appear here after checkout."
          actionLabel="Continue Shopping"
          onAction={() => setPage?.("home")}
        />
      ) : filteredOrders.length === 0 ? (
        <OrdersState
          title="No matching orders"
          message="Try another search term or status filter."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchTerm("");
            setStatusFilter("All");
          }}
        />
      ) : (
        <section className="orders-list" aria-label="Customer orders">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              currentStep={getStatusStep(order.status)}
              onTrack={() => handleTrackOrder(order)}
              onOrderAgain={() => handleOrderAgain(order)}
              onSupport={() => handleContactSupport(order)}
              onContinueShopping={() => setPage?.("home")}
            />
          ))}
        </section>
      )}
    </main>
  );
}

function OrdersHero({ orderCount, refreshing, onRefresh }) {
  return (
    <header className="orders-hero">
      <div>
        <p className="orders-eyebrow">Order History</p>
        <h2>Your Orders</h2>
        <p>
          Track current deliveries, review past nutrition orders, and reorder
          your favorite NutriBlend stack.
        </p>
      </div>

      <div className="orders-hero-actions">
        <button type="button" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
        <span>{orderCount} order{orderCount === 1 ? "" : "s"}</span>
      </div>
    </header>
  );
}

function OrdersState({ title, message, actionLabel, onAction }) {
  return (
    <section className="orders-state">
      <span>NB</span>
      <h3>{title}</h3>
      <p>{message}</p>
      <button type="button" onClick={onAction}>
        {actionLabel}
      </button>
    </section>
  );
}

function OrderCard({
  order,
  currentStep,
  onTrack,
  onOrderAgain,
  onSupport,
  onContinueShopping,
}) {
  const address = safeObject(order.address);
  const items = getOrderItems(order);
  const status = normalizeStatus(order.status);
  const paymentStatus = normalizePaymentStatus(order.payment_status);
  const paymentMethod = normalizePaymentMethod(order.payment_method);
  const addressText = getAddressText(address) || "Delivery address not available";

  return (
    <article className="order-card">
      <div className="order-card-top">
        <div>
          <p className="order-label">Order ID</p>
          <h3>{formatOrderId(order.id)}</h3>
          <span>{formatDateTime(order.created_at)}</span>
        </div>

        <div className="order-badges">
          <span className={getStatusClass(status)}>{status}</span>
          <span className={getPaymentStatusClass(paymentStatus)}>
            {paymentStatus}
          </span>
        </div>
      </div>

      <div className="order-summary-grid">
        <InfoTile label="Total Amount" value={money(getOrderTotal(order))} highlight />
        <InfoTile label="Payment Method" value={paymentMethod} />
        <InfoTile label="Quantity" value={items.reduce((sum, item) => sum + getItemQty(item), 0)} />
        <InfoTile label="Order Status" value={status} />
      </div>

      <section className="ordered-items">
        <div className="ordered-items-head">
          <h4>Ordered Items</h4>
          <span>{items.length} item{items.length === 1 ? "" : "s"}</span>
        </div>

        <div className="ordered-items-list">
          {items.map((item, index) => (
            <div className="ordered-item-row" key={item.id || `${order.id}-${index}`}>
              <div>
                <strong>{getItemName(item)}</strong>
                <p>Qty {getItemQty(item)} x {money(getItemPrice(item))}</p>
              </div>
              <span>{money(getItemSubtotal(item))}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="order-address-box">
        <p className="order-label">Delivery Address</p>
        <strong>{address.name || "Customer"}</strong>
        <p>{addressText}</p>
      </section>

      {status !== "Cancelled" && (
        <div className="order-progress" aria-label="Order tracking progress">
          {ORDER_STEPS.map((step, index) => (
            <div
              className={`order-progress-step ${index <= currentStep ? "active" : ""}`}
              key={step}
            >
              <span>{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      )}

      <div className="order-actions">
        <button type="button" className="track-btn" onClick={onTrack}>
          Track Order
        </button>
        <button type="button" className="again-btn" onClick={onOrderAgain}>
          Order Again
        </button>
        <button type="button" className="support-btn" onClick={onSupport}>
          Contact Support
        </button>
        <button type="button" className="shop-btn" onClick={onContinueShopping}>
          Continue Shopping
        </button>
      </div>
    </article>
  );
}

function InfoTile({ label, value, highlight = false }) {
  return (
    <div className="order-info-tile">
      <span>{label}</span>
      <strong className={highlight ? "highlight" : ""}>{value}</strong>
    </div>
  );
}
