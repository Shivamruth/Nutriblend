import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";
import { jsPDF } from "jspdf";
import "../styles/orders.css";

const ORDER_STEPS = ["Placed", "Preparing", "Out for Delivery", "Delivered"];

const ORDER_STATUSES = [
  "All",
  "Placed",
  "Preparing",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

const PAYMENT_FILTERS = ["All", "COD", "Online"];

const DATE_FILTERS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

const CANCEL_REASONS = [
  "Ordered by mistake",
  "Need to change address",
  "Need to change items",
  "Delivery time issue",
  "Payment issue",
  "Other reason",
];

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatOrderId = (id) => {
  if (!id) return "NB-000000";

  const value = String(id);

  if (/^\d+$/.test(value)) {
    return `NB-${value.padStart(6, "0")}`;
  }

  return `NB-${value.slice(-8).toUpperCase()}`;
};

const formatStatus = (status) => {
  const value = String(status || "Placed").toLowerCase();

  if (value === "placed") return "Placed";
  if (value === "preparing") return "Preparing";
  if (value === "out for delivery") return "Out for Delivery";
  if (value === "out_for_delivery") return "Out for Delivery";
  if (value === "delivered") return "Delivered";
  if (value === "cancelled") return "Cancelled";
  if (value === "canceled") return "Cancelled";

  return "Placed";
};

const formatDate = (dateValue) => {
  if (!dateValue) return "N/A";

  return new Date(dateValue).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

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

const isSameDay = (dateA, dateB) =>
  dateA.getFullYear() === dateB.getFullYear() &&
  dateA.getMonth() === dateB.getMonth() &&
  dateA.getDate() === dateB.getDate();

const isThisWeek = (date) => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  return date >= startOfWeek && date < endOfWeek;
};

const isThisMonth = (date) => {
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
};

const filterByDateRange = (orders, range) => {
  if (range === "all") return orders;

  const now = new Date();

  return orders.filter((order) => {
    if (!order.created_at) return false;

    const orderDate = new Date(order.created_at);

    if (Number.isNaN(orderDate.getTime())) return false;

    if (range === "today") return isSameDay(orderDate, now);
    if (range === "week") return isThisWeek(orderDate);
    if (range === "month") return isThisMonth(orderDate);

    return true;
  });
};

const getPaymentMethod = (order) => order.payment_method || "COD";
const getPaymentStatus = (order) => order.payment_status || "Pending";

const getOrderItems = (order) => {
  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items;
  }

  return [
    {
      id: order.id,
      name: order.product_name || "NutriBlend Order",
      price: order.price || order.total || 0,
      qty: order.qty || 1,
      isPlan: false,
    },
  ];
};

const getItemName = (item) =>
  item.name || item.product_name || "NutriBlend Item";

const getItemSubtotal = (item) =>
  Number(item.price || 0) * Number(item.qty || 1);

const getOrderTotal = (order) => Number(order.total || order.price || 0);

const getStatusClass = (status) =>
  `order-status-badge status-${String(status || "Placed")
    .toLowerCase()
    .replaceAll(" ", "-")}`;

const getPaymentClass = (paymentMethod) =>
  `orders-payment-badge payment-${String(paymentMethod || "COD")
    .toLowerCase()
    .replaceAll(" ", "-")}`;

const getPaymentStatusClass = (paymentStatus) =>
  `orders-payment-status payment-status-${String(paymentStatus || "Pending")
    .toLowerCase()
    .replaceAll(" ", "-")}`;

export default function Orders({ setPage }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("all");

  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [customCancelReason, setCustomCancelReason] = useState("");

  const { notify } = useNotification();

  const fetchOrdersFromSupabase = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        await supabase.auth.signOut();
        setOrders([]);
        setErrorMessage("Your login session expired. Please log in again.");
        notify("Your login session expired. Please log in again ❌", "error");
        return;
      }

      const userOrders = await fetchOrdersFromSupabase(session.user.id);
      setOrders(userOrders);
    } catch (err) {
      console.error("Fetch orders error:", err);
      setOrders([]);
      setErrorMessage(
        err.message || "Something went wrong while loading orders."
      );
      notify(err.message || "Something went wrong while loading orders ❌", "error");
    } finally {
      setLoading(false);
    }
  }, [fetchOrdersFromSupabase, notify]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const dateFiltered = filterByDateRange(orders, dateFilter);

    return dateFiltered.filter((order) => {
      const status = formatStatus(order.status);
      const paymentMethod = getPaymentMethod(order);
      const paymentStatus = getPaymentStatus(order);
      const formattedId = formatOrderId(order.id).toLowerCase();

      const itemsText = getOrderItems(order)
        .map((item) => getItemName(item))
        .join(" ")
        .toLowerCase();

      const addressText = [
        order.address?.name,
        order.address?.phone,
        order.address?.street,
        order.address?.city,
        order.address?.state,
        order.address?.pincode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesStatus = statusFilter === "All" || status === statusFilter;

      const matchesPayment =
        paymentFilter === "All" ||
        paymentMethod.toLowerCase().includes(paymentFilter.toLowerCase());

      const matchesSearch =
        !query ||
        formattedId.includes(query) ||
        String(order.id || "").toLowerCase().includes(query) ||
        String(order.email || "").toLowerCase().includes(query) ||
        String(order.product_name || "").toLowerCase().includes(query) ||
        String(order.cancel_reason || "").toLowerCase().includes(query) ||
        String(paymentMethod || "").toLowerCase().includes(query) ||
        String(paymentStatus || "").toLowerCase().includes(query) ||
        itemsText.includes(query) ||
        addressText.includes(query);

      return matchesStatus && matchesPayment && matchesSearch;
    });
  }, [orders, searchTerm, statusFilter, paymentFilter, dateFilter]);

  const filtersActive =
    searchTerm ||
    statusFilter !== "All" ||
    paymentFilter !== "All" ||
    dateFilter !== "all";

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setPaymentFilter("All");
    setDateFilter("all");
  };

  const getStatusStep = (status) => {
    const currentStatus = formatStatus(status);
    return ORDER_STEPS.indexOf(currentStatus);
  };

  const canCancelOrder = (order) => formatStatus(order.status) === "Placed";

  const getDeliveryMessage = (status) => {
    const currentStatus = formatStatus(status);

    if (currentStatus === "Placed") {
      return "Your order is received. Preparation will start soon.";
    }

    if (currentStatus === "Preparing") {
      return "Your shake/order is being prepared.";
    }

    if (currentStatus === "Out for Delivery") {
      return "Your order is on the way.";
    }

    if (currentStatus === "Delivered") {
      return "Your order has been delivered.";
    }

    if (currentStatus === "Cancelled") {
      return "This order was cancelled.";
    }

    return "Order status is being updated.";
  };

  const openCancelModal = (order) => {
    if (!canCancelOrder(order)) {
      notify("This order cannot be cancelled now ❌", "error");
      return;
    }

    setCancelTarget(order);
    setCancelReason("");
    setCustomCancelReason("");
  };

  const closeCancelModal = () => {
    setCancelTarget(null);
    setCancelReason("");
    setCustomCancelReason("");
  };

  const confirmCancelOrder = async () => {
    if (!cancelTarget) return;

    const finalReason =
      cancelReason === "Other reason"
        ? customCancelReason.trim()
        : cancelReason.trim();

    if (!finalReason) {
      notify("Please select or enter a cancellation reason ❌", "error");
      return;
    }

    setActionLoadingId(cancelTarget.id);

    try {
      const cancelledAt = new Date().toISOString();

      const { error } = await supabase
        .from("orders")
        .update({
          status: "Cancelled",
          cancel_reason: finalReason,
          cancelled_at: cancelledAt,
        })
        .eq("id", cancelTarget.id)
        .eq("status", "Placed")
        .select("*")
        .single();

      if (error) throw error;

      setOrders((prev) =>
        prev.map((order) =>
          order.id === cancelTarget.id
            ? {
                ...order,
                status: "Cancelled",
                cancel_reason: finalReason,
                cancelled_at: cancelledAt,
              }
            : order
        )
      );

      closeCancelModal();
      notify("Order cancelled successfully ✅", "success");
    } catch (error) {
      console.error("Cancel order error:", error);
      notify(error.message || "Failed to cancel order ❌", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const reorderItems = (order) => {
    const orderItems = getOrderItems(order);

    if (!orderItems.length) {
      notify("No items found in this order ❌", "error");
      return;
    }

    const existingCart = JSON.parse(localStorage.getItem("cart")) || [];
    const updatedCart = [...existingCart];

    orderItems.forEach((orderItem) => {
      const itemId = orderItem.id || orderItem.product_id || orderItem.name;

      const existing = updatedCart.find(
        (cartItem) =>
          cartItem.id === itemId ||
          cartItem.name === orderItem.name ||
          cartItem.product_name === orderItem.product_name
      );

      if (existing) {
        existing.qty = Number(existing.qty || 1) + Number(orderItem.qty || 1);
      } else {
        updatedCart.push({
          ...orderItem,
          id: itemId,
          name: getItemName(orderItem),
          product_name: getItemName(orderItem),
          qty: Number(orderItem.qty || 1),
          price: Number(orderItem.price || 0),
        });
      }
    });

    localStorage.setItem("cart", JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("cartUpdated"));

    notify("Items added to cart again ✅", "success");

    if (setPage) {
      setPage("cart");
    }
  };

  const downloadInvoice = (order) => {
    try {
      const doc = new jsPDF();
      const items = getOrderItems(order);
      const orderId = formatOrderId(order.id);

      doc.setFontSize(20);
      doc.text("NUTRIBLEND INVOICE", 20, 20);

      doc.setFontSize(11);
      doc.text(`Order ID: ${orderId}`, 20, 38);
      doc.text(`Date: ${formatDateTime(order.created_at)}`, 20, 48);
      doc.text(`Name: ${order.address?.name || "N/A"}`, 20, 63);
      doc.text(`Phone: ${order.address?.phone || "N/A"}`, 20, 73);

      const addressLine = `${order.address?.street || ""}, ${
        order.address?.city || ""
      }, ${order.address?.state || ""} - ${order.address?.pincode || ""}`;

      doc.text(`Address: ${addressLine}`, 20, 83, { maxWidth: 170 });

      doc.text(`Payment: ${getPaymentMethod(order)}`, 20, 103);
      doc.text(`Payment Status: ${getPaymentStatus(order)}`, 20, 113);
      doc.text(`Order Status: ${formatStatus(order.status)}`, 20, 123);

      let y = 138;

      if (formatStatus(order.status) === "Cancelled") {
        doc.text(`Cancel Reason: ${order.cancel_reason || "N/A"}`, 20, y, {
          maxWidth: 170,
        });
        y += 12;
      }

      doc.setFontSize(14);
      doc.text("Items", 20, y);
      y += 12;

      doc.setFontSize(10);

      items.forEach((item, index) => {
        const name = getItemName(item);
        const qty = item.qty || 1;
        const price = item.price || 0;
        const subtotal = getItemSubtotal(item);

        doc.text(`${index + 1}. ${name}`, 20, y, { maxWidth: 115 });
        doc.text(`Qty: ${qty}`, 140, y);
        doc.text(`Rs. ${subtotal}`, 165, y);

        y += 8;

        if (item.isPlan) {
          doc.text(
            `Plan: ${item.duration || item.plan_duration || "N/A"} | Protein: ${
              item.protein || "N/A"
            }`,
            25,
            y,
            { maxWidth: 150 }
          );
          y += 8;
        }

        doc.text(`Price: Rs. ${price}`, 25, y);
        y += 10;

        if (y > 260) {
          doc.addPage();
          y = 25;
        }
      });

      doc.setFontSize(14);
      doc.text(`Total: Rs. ${getOrderTotal(order)}`, 20, y + 10);
      doc.setFontSize(10);
      doc.text("Thank you for choosing NutriBlend.", 20, y + 24);

      doc.save(`invoice_${orderId}.pdf`);
      notify("Invoice downloaded ✅", "success");
    } catch (error) {
      console.error("Invoice download error:", error);
      notify("Failed to download invoice ❌", "error");
    }
  };

  if (loading) {
    return (
      <div className="orders-page">
        <div className="orders-header">
          <div>
            <p className="orders-eyebrow">Order History</p>
            <h2>Your Orders</h2>
          </div>
        </div>

        <div className="orders-loading">
          {[1, 2, 3].map((i) => (
            <div key={i} className="order-card order-skeleton">
              <div className="home-skeleton-text loading" />
              <div className="home-skeleton-text-sm loading" />
              <div className="home-skeleton-text-sm loading" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="orders-header">
        <div>
          <p className="orders-eyebrow">Order History</p>
          <h2>Your Orders</h2>
        </div>

        <div className="orders-header-actions">
          <button className="orders-refresh-btn" onClick={fetchOrders}>
            Refresh
          </button>

          <span className="orders-count">
            {orders.length} order{orders.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {orders.length > 0 && (
        <div className="orders-controls">
          <input
            type="text"
            placeholder="Search NB-000055, product, phone, address, payment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === "All" ? "All Status" : status}
              </option>
            ))}
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            {PAYMENT_FILTERS.map((payment) => (
              <option key={payment} value={payment}>
                {payment === "All" ? "All Payments" : payment}
              </option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            {DATE_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>

          {filtersActive && (
            <button className="orders-clear-btn" onClick={resetFilters}>
              Clear
            </button>
          )}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="orders-empty">
          <span className="orders-empty-icon">📦</span>

          <h3>{errorMessage ? "Unable to load orders" : "No orders yet"}</h3>

          <p>
            {errorMessage ||
              "When you place your first order, it will appear here."}
          </p>

          {errorMessage ? (
            <button onClick={fetchOrders}>Try Again</button>
          ) : (
            <button onClick={() => setPage?.("home")}>Start Shopping</button>
          )}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="orders-empty">
          <span className="orders-empty-icon">🔎</span>
          <h3>No matching orders found</h3>
          <p>Try clearing filters or changing your search.</p>
          <button onClick={resetFilters}>Clear Filters</button>
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map((order, index) => {
            const currentStatus = formatStatus(order.status);
            const currentStep = getStatusStep(currentStatus);
            const orderItems = getOrderItems(order);
            const isCancelled = currentStatus === "Cancelled";
            const isActionLoading = actionLoadingId === order.id;
            const isExpanded = expandedOrderId === order.id;
            const paymentMethod = getPaymentMethod(order);
            const paymentStatus = getPaymentStatus(order);

            return (
              <div
                key={order.id}
                className={`order-card ${
                  isCancelled ? "order-card-cancelled" : ""
                }`}
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                <div className="order-card-header">
                  <div className="order-id">
                    <span className="order-id-label">Order</span>
                    <span className="order-id-value">
                      {formatOrderId(order.id)}
                    </span>
                  </div>

                  <div className="order-card-badges">
                    <span className={getPaymentClass(paymentMethod)}>
                      {paymentMethod}
                    </span>
                    <span className={getPaymentStatusClass(paymentStatus)}>
                      {paymentStatus}
                    </span>
                    <span className={getStatusClass(currentStatus)}>
                      {currentStatus}
                    </span>
                  </div>
                </div>

                <div className="order-delivery-message">
                  <span>
                    {isCancelled
                      ? "❌"
                      : currentStatus === "Delivered"
                      ? "✅"
                      : "🚚"}
                  </span>
                  <p>{getDeliveryMessage(currentStatus)}</p>
                </div>

                <div className="order-card-body">
                  <InfoRow label="Total" value={money(getOrderTotal(order))} strong />
                  <InfoRow label="Location" value={order.address?.city || "N/A"} />
                  <InfoRow label="Payment" value={paymentMethod} />
                  <InfoRow label="Placed At" value={formatDate(order.created_at)} />
                </div>

                <div className="order-items-box">
                  <div className="order-items-header">
                    <h3>Order Items</h3>

                    <span>
                      {orderItems.length} item
                      {orderItems.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="order-items-list">
                    {orderItems.map((item, itemIndex) => (
                      <div
                        className={`order-item-row ${
                          item.isPlan ? "order-plan-row" : ""
                        }`}
                        key={item.id || itemIndex}
                      >
                        <div className="order-item-left">
                          <div className="order-item-icon">
                            {item.isPlan ? item.image || "📅" : "🥤"}
                          </div>

                          <div>
                            <div className="order-item-title">
                              <strong>{getItemName(item)}</strong>

                              {item.isPlan && (
                                <span className="order-plan-chip">Plan</span>
                              )}
                            </div>

                            <p>
                              Qty: {item.qty || 1} • {money(item.price || 0)}
                            </p>

                            {item.isPlan && (
                              <p>
                                {item.duration ||
                                  item.plan_duration ||
                                  "Plan duration"}{" "}
                                • {item.protein || "Protein"}
                              </p>
                            )}
                          </div>
                        </div>

                        <span className="order-item-price">
                          {money(getItemSubtotal(item))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {isCancelled ? (
                  <div className="cancelled-box">
                    <strong>❌ This order has been cancelled</strong>

                    {order.cancel_reason && (
                      <p>Reason: {order.cancel_reason}</p>
                    )}

                    {order.cancelled_at && (
                      <p>Cancelled at: {formatDateTime(order.cancelled_at)}</p>
                    )}
                  </div>
                ) : (
                  <div className="order-tracking">
                    {ORDER_STEPS.map((step, stepIndex) => (
                      <div
                        key={step}
                        className={`tracking-step ${
                          stepIndex <= currentStep ? "active" : ""
                        }`}
                      >
                        <div className="tracking-circle">{stepIndex + 1}</div>
                        <p>{step}</p>
                      </div>
                    ))}
                  </div>
                )}

                {isExpanded && (
                  <div className="order-extra-details">
                    <h3>Delivery Details</h3>

                    <div className="order-address-card">
                      <p>
                        <strong>{order.address?.name || "Customer"}</strong>
                      </p>
                      <p>{order.address?.phone || "No phone"}</p>
                      <p>
                        {order.address?.street || "No street"},{" "}
                        {order.address?.city || "No city"},{" "}
                        {order.address?.state || ""} -{" "}
                        {order.address?.pincode || "N/A"}
                      </p>
                    </div>

                    <div className="order-extra-grid">
                      <InfoRow label="Order ID" value={formatOrderId(order.id)} />
                      <InfoRow
                        label="Full Date"
                        value={formatDateTime(order.created_at)}
                      />
                      <InfoRow label="Payment Status" value={paymentStatus} />
                      <InfoRow label="Order Status" value={currentStatus} />
                    </div>

                    <div className="order-help-box">
                      <span>💬</span>
                      <p>
                        Need help with this order? Keep your order ID{" "}
                        <strong>{formatOrderId(order.id)}</strong> ready.
                      </p>
                    </div>
                  </div>
                )}

                <div className="order-actions">
                  {canCancelOrder(order) && (
                    <button
                      className="cancel-order-btn"
                      disabled={isActionLoading}
                      onClick={() => openCancelModal(order)}
                    >
                      {isActionLoading ? "Cancelling..." : "Cancel Order"}
                    </button>
                  )}

                  <button
                    className="details-btn"
                    onClick={() =>
                      setExpandedOrderId(isExpanded ? null : order.id)
                    }
                  >
                    {isExpanded ? "Hide Details" : "View Details"}
                  </button>

                  <button
                    className="reorder-btn"
                    onClick={() => reorderItems(order)}
                  >
                    Reorder
                  </button>

                  <button
                    className="invoice-btn"
                    onClick={() => downloadInvoice(order)}
                  >
                    Invoice
                  </button>
                </div>

                {canCancelOrder(order) && (
                  <p className="order-cancel-note">
                    You can cancel this order before preparation starts.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {cancelTarget && (
        <div className="cancel-modal-overlay">
          <div className="cancel-modal">
            <div className="cancel-modal-header">
              <div>
                <p className="orders-eyebrow">Cancel Order</p>
                <h3>{formatOrderId(cancelTarget.id)}</h3>
              </div>

              <button onClick={closeCancelModal}>✕</button>
            </div>

            <p className="cancel-modal-desc">
              Please select a reason. This helps us improve NutriBlend service.
            </p>

            <div className="cancel-reasons-list">
              {CANCEL_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={cancelReason === reason ? "selected" : ""}
                >
                  <input
                    type="radio"
                    name="cancelReason"
                    value={reason}
                    checked={cancelReason === reason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />

                  <span>{reason}</span>
                </label>
              ))}
            </div>

            {cancelReason === "Other reason" && (
              <textarea
                placeholder="Enter your reason"
                value={customCancelReason}
                onChange={(e) => setCustomCancelReason(e.target.value)}
                rows="3"
              />
            )}

            <div className="cancel-modal-actions">
              <button className="cancel-modal-back" onClick={closeCancelModal}>
                Keep Order
              </button>

              <button
                className="cancel-modal-confirm"
                onClick={confirmCancelOrder}
                disabled={actionLoadingId === cancelTarget.id}
              >
                {actionLoadingId === cancelTarget.id
                  ? "Cancelling..."
                  : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, strong = false }) {
  return (
    <div className="order-detail-row">
      <span className="order-detail-label">{label}</span>
      <span className={`order-detail-value ${strong ? "order-total" : ""}`}>
        {value}
      </span>
    </div>
  );
}