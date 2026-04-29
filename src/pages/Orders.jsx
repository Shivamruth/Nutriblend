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

  if (loading) return <p style={{ color: "white" }}>Loading orders...</p>;

  return (
    <div className="orders-page">
      <h2>Your Orders</h2>

      {orders.length === 0 ? (
        <p>No orders yet</p>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="order-card">

            <p>🆔 Order ID: {order.id}</p>

            <p>💰 Total: ₹{order.total}</p>

            <p>📍 {order.address?.city}</p>

            <p>💳 Payment: {order.payment_method}</p>

            <p>📦 Status: {order.status}</p>

            <p>
              📅 {new Date(order.created_at).toLocaleString()}
            </p>

            <button onClick={() => downloadInvoice(order)}>
              Download Invoice
            </button>
          </div>
        ))
      )}
    </div>
  );
}