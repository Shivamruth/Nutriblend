import { useEffect, useState } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from "recharts";

export default function Admin({ setPage }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { notify } = useNotification();

  useEffect(() => { checkAdmin(); }, []);

  const checkAdmin = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { notify("Login required", "error"); setPage("admin-login"); return; }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
    if (profile?.role !== "admin") { notify("Access denied ❌", "error"); setPage("home"); return; }
    fetchOrders();
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/orders", { headers: { Authorization: `Bearer ${session?.access_token}` } });
      const json = await res.json();
      if (json.success) setOrders(json.data || []);
      else console.error(json.message);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const logout = async () => { await supabase.auth.signOut(); setPage("home"); };

  // DATA
  const revenueData = {}, orderCountData = {};
  const statusData = { placed: 0, packed: 0, shipped: 0, delivered: 0 };

  orders.forEach((o) => {
    const date = new Date(o.created_at).toLocaleDateString();
    revenueData[date] = (revenueData[date] || 0) + (o.total || 0);
    orderCountData[date] = (orderCountData[date] || 0) + 1;
    if (o.status) statusData[o.status] = (statusData[o.status] || 0) + 1;
  });

  const revenueChart = Object.keys(revenueData).map((d) => ({ date: d, revenue: revenueData[d] }));
  const ordersChart = Object.keys(orderCountData).map((d) => ({ date: d, orders: orderCountData[d] }));
  const statusChart = Object.keys(statusData).map((s) => ({ name: s, value: statusData[s] }));

  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const COLORS = ["#7cff6b", "#60a5fa", "#facc15", "#f87171"];

  if (loading) {
    return (
      <div className="admin-page">
        <h2>📊 Admin Dashboard</h2>
        <div className="admin-stats">
          {[1, 2, 3].map((i) => <div key={i} className="stat-card"><div className="home-skeleton-text loading" /></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <p className="admin-eyebrow">Dashboard</p>
          <h2>Admin Panel</h2>
        </div>
        <button className="logout-btn" onClick={logout}>Logout</button>
      </div>

      {/* Stats */}
      <div className="admin-stats">
        <div className="stat-card">
          <span className="stat-icon">📦</span>
          <h3>{orders.length}</h3>
          <p>Total Orders</p>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <h3>₹{totalRevenue.toLocaleString()}</h3>
          <p>Revenue</p>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <h3>{statusData.delivered}</h3>
          <p>Delivered</p>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🚚</span>
          <h3>{statusData.shipped}</h3>
          <p>In Transit</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="admin-empty">
          <p>No orders found</p>
        </div>
      ) : (
        <div className="charts-grid">
          <div className="chart-card">
            <h3>📈 Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" stroke="#8ba2be" fontSize={12} />
                <YAxis stroke="#8ba2be" fontSize={12} />
                <Tooltip contentStyle={{ background: "#0c1a30", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }} />
                <Line type="monotone" dataKey="revenue" stroke="#7cff6b" strokeWidth={2} dot={{ fill: "#7cff6b" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>📦 Orders Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ordersChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" stroke="#8ba2be" fontSize={12} />
                <YAxis stroke="#8ba2be" fontSize={12} />
                <Tooltip contentStyle={{ background: "#0c1a30", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }} />
                <Bar dataKey="orders" fill="#60a5fa" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>🥧 Order Status</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusChart} dataKey="value" nameKey="name" outerRadius={80} label>
                  {statusChart.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#0c1a30", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}