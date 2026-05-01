import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase/Client";
import { jsPDF } from "jspdf";

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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

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
      setErrorMessage(err.message || "Something went wrong while loading orders.");
    } finally {
      setLoading(false);
    }
  }, [fetchOrdersFromSupabase]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const downloadInvoice = (order) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("NUTRIBLEND INVOICE", 20, 20);

    doc.setFontSize(12);
    doc.text(`Order ID: ${order.id}`, 20, 40);
    doc.text(`Date: ${new Date(order.created_at).toLocaleString()}`, 20, 50);
    doc.text(`Name: ${order.address?.name || "N/A"}`, 20, 70);
    doc.text(`Phone: ${order.address?.phone || "N/A"}`, 20, 80);
    doc.text(`Address: ${order.address?.street || ""}, ${order.address?.city || ""}`, 20, 90);
    doc.text(`Payment: ${order.payment_method || "N/A"}`, 20, 110);
    doc.text(`Status: ${order.status || "placed"}`, 20, 120);
    doc.text(`Total: Rs. ${order.total || 0}`, 20, 140);

    doc.save(`invoice_${order.id}.pdf`);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return "status-delivered";
      case "shipped":
        return "status-shipped";
      case "packed":
        return "status-packed";
      case "placed":
      default:
        return "status-placed";
    }
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
        <span className="orders-count">
          {orders.length} order{orders.length !== 1 ? "s" : ""}
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="orders-empty">
          <span className="orders-empty-icon">Box</span>
          <h3>{errorMessage ? "Unable to load orders" : "No orders yet"}</h3>
          <p>{errorMessage || "When you place your first order, it will appear here."}</p>
          {errorMessage && (
            <button onClick={fetchOrders}>
              Try Again
            </button>
          )}
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order, index) => (
            <div
              key={order.id}
              className="order-card"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div className="order-card-header">
                <div className="order-id">
                  <span className="order-id-label">Order</span>
                  <span className="order-id-value">#{String(order.id).slice(-8)}</span>
                </div>
                <span className={`order-status ${getStatusColor(order.status)}`}>
                  {order.status || "placed"}
                </span>
              </div>

              <div className="order-card-body">
                <div className="order-detail-row">
                  <span className="order-detail-label">Total</span>
                  <span className="order-detail-value order-total">Rs. {order.total}</span>
                </div>

                <div className="order-detail-row">
                  <span className="order-detail-label">Location</span>
                  <span className="order-detail-value">{order.address?.city || "N/A"}</span>
                </div>

                <div className="order-detail-row">
                  <span className="order-detail-label">Payment</span>
                  <span className="order-detail-value">{order.payment_method || "N/A"}</span>
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

              <button onClick={() => downloadInvoice(order)}>
                Download Invoice
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
