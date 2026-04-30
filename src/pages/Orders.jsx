import { useEffect, useState } from "react";
import { supabase } from "../supabase/Client";
import { jsPDF } from "jspdf";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch("/api/my-orders", {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      const json = await res.json();
      if (json.success) {
        setOrders(json.data);
      } else {
        alert(json.message || "Failed to load orders ❌");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong ❌");
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = (order) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("NUTRIBLEND INVOICE", 20, 20);

    doc.setFontSize(12);
    doc.text(`Order ID: ${order.id}`, 20, 40);
    doc.text(
      `Date: ${new Date(order.created_at).toLocaleString()}`,
      20,
      50
    );

    doc.text(`Name: ${order.address?.name}`, 20, 70);
    doc.text(`Phone: ${order.address?.phone}`, 20, 80);
    doc.text(
      `Address: ${order.address?.street}, ${order.address?.city}`,
      20,
      90
    );

    doc.text(`Payment: ${order.payment_method}`, 20, 110);
    doc.text(`Status: ${order.status}`, 20, 120);

    doc.setFontSize(14);
    doc.text(`Total: ₹${order.total}`, 20, 140);

    doc.save(`invoice_${order.id}.pdf`);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "delivered": return "status-delivered";
      case "shipped": return "status-shipped";
      case "packed": return "status-packed";
      case "placed": return "status-placed";
      default: return "status-placed";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "delivered": return "✅";
      case "shipped": return "🚚";
      case "packed": return "📦";
      case "placed": return "🕐";
      default: return "📋";
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
        <span className="orders-count">{orders.length} order{orders.length !== 1 ? "s" : ""}</span>
      </div>

      {orders.length === 0 ? (
        <div className="orders-empty">
          <span className="orders-empty-icon">📦</span>
          <h3>No orders yet</h3>
          <p>When you place your first order, it will appear here.</p>
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
                  {getStatusIcon(order.status)} {order.status}
                </span>
              </div>

              <div className="order-card-body">
                <div className="order-detail-row">
                  <span className="order-detail-label">💰 Total</span>
                  <span className="order-detail-value order-total">₹{order.total}</span>
                </div>

                <div className="order-detail-row">
                  <span className="order-detail-label">📍 Location</span>
                  <span className="order-detail-value">{order.address?.city || "N/A"}</span>
                </div>

                <div className="order-detail-row">
                  <span className="order-detail-label">💳 Payment</span>
                  <span className="order-detail-value">{order.payment_method}</span>
                </div>

                <div className="order-detail-row">
                  <span className="order-detail-label">📅 Date</span>
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
                📄 Download Invoice
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}