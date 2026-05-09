import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/Client";
import { jsPDF } from "jspdf";
import "../styles/orders.css";

const ORDER_STEPS = ["Placed", "Preparing", "Out for Delivery", "Delivered"];

const CANCEL_REASONS = [
  "Ordered by mistake",
  "Need to change address",
  "Need to change items",
  "Delivery time issue",
  "Payment issue",
  "Other reason",
];

export default function Orders({ setPage }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [customCancelReason, setCustomCancelReason] = useState("");

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
    } finally {
      setLoading(false);
    }
  }, [fetchOrdersFromSupabase]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

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

  const getItemName = (item) => {
    return item.name || item.product_name || "NutriBlend Item";
  };

  const getItemSubtotal = (item) => {
    return Number(item.price || 0) * Number(item.qty || 1);
  };

  const getOrderTotal = (order) => {
    return Number(order.total || order.price || 0);
  };

  const orderSummary = useMemo(() => {
    return {
      total: orders.length,
      active: orders.filter((order) =>
        ["Placed", "Preparing", "Out for Delivery"].includes(
          formatStatus(order.status)
        )
      ).length,
      delivered: orders.filter(
        (order) => formatStatus(order.status) === "Delivered"
      ).length,
      cancelled: orders.filter(
        (order) => formatStatus(order.status) === "Cancelled"
      ).length,
    };
  }, [orders]);

  const getStatusStep = (status) => {
    const currentStatus = formatStatus(status);
    return ORDER_STEPS.indexOf(currentStatus);
  };

  const getStatusClass = (status) => {
    return `order-status-badge status-${String(status || "Placed")
      .toLowerCase()
      .replaceAll(" ", "-")}`;
  };

  const canCancelOrder = (order) => {
    return formatStatus(order.status) === "Placed";
  };

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
      alert("This order cannot be cancelled now.");
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
      alert("Please select or enter a cancellation reason.");
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
      alert("Order cancelled successfully ✅");
    } catch (error) {
      console.error("Cancel order error:", error);
      alert(error.message || "Failed to cancel order");
    } finally {
      setActionLoadingId(null);
    }
  };

  const reorderItems = (order) => {
    const orderItems = getOrderItems(order);

    if (!orderItems.length) {
      alert("No items found in this order.");
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

    alert("Items added to cart again ✅");

    if (setPage) {
      setPage("cart");
    }
  };

  const downloadInvoice = (order) => {
    const doc = new jsPDF();
    const items = getOrderItems(order);

    doc.setFontSize(18);
    doc.text("NUTRIBLEND INVOICE", 20, 20);

    doc.setFontSize(12);
    doc.text(`Order ID: ${order.id}`, 20, 40);
    doc.text(`Date: ${formatDateTime(order.created_at)}`, 20, 50);
    doc.text(`Name: ${order.address?.name || "N/A"}`, 20, 70);
    doc.text(`Phone: ${order.address?.phone || "N/A"}`, 20, 80);

    const addressLine = `${order.address?.street || ""}, ${
      order.address?.city || ""
    }, ${order.address?.state || ""} - ${order.address?.pincode || ""}`;

    doc.text(`Address: ${addressLine}`, 20, 90, { maxWidth: 170 });

    doc.text(`Payment: ${order.payment_method || "N/A"}`, 20, 110);
    doc.text(`Status: ${formatStatus(order.status)}`, 20, 120);

    let y = 135;

    if (formatStatus(order.status) === "Cancelled") {
      doc.text(`Cancel Reason: ${order.cancel_reason || "N/A"}`, 20, y, {
        maxWidth: 170,
      });
      y += 12;
    }

    doc.setFontSize(14);
    doc.text("Items:", 20, y);
    y += 12;

    doc.setFontSize(11);

    items.forEach((item, index) => {
      const name = getItemName(item);
      const qty = item.qty || 1;
      const price = item.price || 0;
      const subtotal = getItemSubtotal(item);

      doc.text(`${index + 1}. ${name}`, 20, y, { maxWidth: 120 });
      doc.text(`Qty: ${qty}`, 145, y);
      doc.text(`Rs. ${subtotal}`, 170, y);

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

    doc.save(`invoice_${order.id}.pdf`);
  };

  if (loading) {
    return (
      <div className="orders-page">
        <h2>Your Orders</h2>

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
        <div className="orders-summary-grid">
          <SummaryCard icon="📦" label="Total" value={orderSummary.total} />
          <SummaryCard icon="⏳" label="Active" value={orderSummary.active} />
          <SummaryCard
            icon="✅"
            label="Delivered"
            value={orderSummary.delivered}
          />
          <SummaryCard
            icon="❌"
            label="Cancelled"
            value={orderSummary.cancelled}
          />
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

          {errorMessage && <button onClick={fetchOrders}>Try Again</button>}
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order, index) => {
            const currentStatus = formatStatus(order.status);
            const currentStep = getStatusStep(currentStatus);
            const orderItems = getOrderItems(order);
            const isCancelled = currentStatus === "Cancelled";
            const isActionLoading = actionLoadingId === order.id;

            return (
              <div
                key={order.id}
                className="order-card"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="order-card-header">
                  <div className="order-id">
                    <span className="order-id-label">Order</span>
                    <span className="order-id-value">
                      #{String(order.id).slice(-8)}
                    </span>
                  </div>

                  <span className={getStatusClass(currentStatus)}>
                    {currentStatus}
                  </span>
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
                  <div className="order-detail-row">
                    <span className="order-detail-label">Total</span>
                    <span className="order-detail-value order-total">
                      ₹{getOrderTotal(order)}
                    </span>
                  </div>

                  <div className="order-detail-row">
                    <span className="order-detail-label">Location</span>
                    <span className="order-detail-value">
                      {order.address?.city || "N/A"}
                    </span>
                  </div>

                  <div className="order-detail-row">
                    <span className="order-detail-label">Payment</span>
                    <span className="order-detail-value">
                      {order.payment_method || "N/A"}
                    </span>
                  </div>

                  <div className="order-detail-row">
                    <span className="order-detail-label">Date</span>
                    <span className="order-detail-value">
                      {formatDate(order.created_at)}
                    </span>
                  </div>
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
                              Qty: {item.qty || 1} • ₹{item.price || 0}
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
                          ₹{getItemSubtotal(item)}
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
                    className="reorder-btn"
                    onClick={() => reorderItems(order)}
                  >
                    Reorder
                  </button>

                  <button
                    className="invoice-btn"
                    onClick={() => downloadInvoice(order)}
                  >
                    Download Invoice
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
                <h3>Order #{String(cancelTarget.id).slice(-8)}</h3>
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

function SummaryCard({ icon, label, value }) {
  return (
    <div className="orders-summary-card">
      <span>{icon}</span>

      <div>
        <strong>{value}</strong>
        <p>{label}</p>
      </div>
    </div>
  );
}