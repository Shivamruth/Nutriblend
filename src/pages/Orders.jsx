import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase/Client";
import { jsPDF } from "jspdf";
import "../styles/orders.css";

const ORDER_STEPS = ["Placed", "Preparing", "Out for Delivery", "Delivered"];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchOrdersFromSupabase = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

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
      console.error(err);
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

  const getStatusStep = (status) => {
    const currentStatus = status || "Placed";
    return ORDER_STEPS.indexOf(currentStatus);
  };

  const getStatusClass = (status) => {
    return `order-status-badge status-${String(status || "Placed")
      .toLowerCase()
      .replaceAll(" ", "-")}`;
  };

  const formatStatus = (status) => {
    return status || "Placed";
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

  const downloadInvoice = (order) => {
    const doc = new jsPDF();
    const items = getOrderItems(order);

    doc.setFontSize(18);
    doc.text("NUTRIBLEND INVOICE", 20, 20);

    doc.setFontSize(12);
    doc.text(`Order ID: ${order.id}`, 20, 40);
    doc.text(`Date: ${new Date(order.created_at).toLocaleString()}`, 20, 50);
    doc.text(`Name: ${order.address?.name || "N/A"}`, 20, 70);
    doc.text(`Phone: ${order.address?.phone || "N/A"}`, 20, 80);

    const addressLine = `${order.address?.street || ""}, ${
      order.address?.city || ""
    }, ${order.address?.state || ""} - ${order.address?.pincode || ""}`;

    doc.text(`Address: ${addressLine}`, 20, 90, { maxWidth: 170 });

    doc.text(`Payment: ${order.payment_method || "N/A"}`, 20, 110);
    doc.text(`Status: ${formatStatus(order.status)}`, 20, 120);

    doc.setFontSize(14);
    doc.text("Items:", 20, 138);

    doc.setFontSize(11);
    let y = 150;

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
    doc.text(`Total: Rs. ${order.total || 0}`, 20, y + 10);

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

                <div className="order-card-body">
                  <div className="order-detail-row">
                    <span className="order-detail-label">Total</span>
                    <span className="order-detail-value order-total">
                      Rs. {order.total || order.price || 0}
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
                      {new Date(order.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
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

                {currentStatus === "Cancelled" ? (
                  <div className="cancelled-box">
                    ❌ This order has been cancelled
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

                <button
                  className="invoice-btn"
                  onClick={() => downloadInvoice(order)}
                >
                  Download Invoice
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}