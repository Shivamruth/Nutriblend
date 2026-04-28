import { useEffect, useState } from "react";
import { supabase } from "../supabase/Client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

export default function Admin({ setPage }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdmin();
  }, []);

  // 🔐 ADMIN CHECK (ROLE BASED)
  const checkAdmin = async () => {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      notify("Login required", "error");
      setPage("admin-login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (profile?.role !== "admin") {
      notify("Access denied ❌", "error");
      setPage("home");
      return;
    }

    fetchOrders(); // ✅ only after validation
  };

  // 📦 FETCH ORDERS
  const fetchOrders = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  };

  // 🔐 LOGOUT
  const logout = async () => {
    await supabase.auth.signOut();
    setPage("home");
  };

  // 📊 DATA PROCESSING
  const revenueData = {};
  const orderCountData = {};
  const statusData = {
    placed: 0,
    packed: 0,
    shipped: 0,
    delivered: 0,
  };

  orders.forEach((o) => {
    const date = new Date(o.created_at).toLocaleDateString();

    revenueData[date] = (revenueData[date] || 0) + (o.total || 0);
    orderCountData[date] = (orderCountData[date] || 0) + 1;

    if (o.status) {
      statusData[o.status] = (statusData[o.status] || 0) + 1;
    }
  });

  const revenueChart = Object.keys(revenueData).map((d) => ({
    date: d,
    revenue: revenueData[d],
  }));

  const ordersChart = Object.keys(orderCountData).map((d) => ({
    date: d,
    orders: orderCountData[d],
  }));

  const statusChart = Object.keys(statusData).map((s) => ({
    name: s,
    value: statusData[s],
  }));

  const COLORS = ["#7cff6b", "#60a5fa", "#facc15", "#f87171"];

  // ⏳ LOADING UI
  if (loading) {
    return <p style={{ color: "white" }}>Loading dashboard...</p>;
  }

  return (
    <div className="admin-page">
      <h2>📊 Admin Dashboard</h2>

      <button className="logout-btn" onClick={logout}>
        Logout
      </button>

      {orders.length === 0 ? (
        <p>No orders found</p>
      ) : (
        <div className="charts-grid">

          {/* 📈 Revenue */}
          <div className="chart-card">
            <h3>Revenue Trend</h3>
            <LineChart width={400} height={250} data={revenueChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#7cff6b" />
            </LineChart>
          </div>

          {/* 📦 Orders */}
          <div className="chart-card">
            <h3>Orders Trend</h3>
            <BarChart width={400} height={250} data={ordersChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="#60a5fa" />
            </BarChart>
          </div>

          {/* 🥧 Status */}
          <div className="chart-card">
            <h3>Order Status</h3>
            <PieChart width={300} height={250}>
              <Pie
                data={statusChart}
                dataKey="value"
                nameKey="name"
                outerRadius={80}
              >
                {statusChart.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </div>

        </div>
      )}
    </div>
  );
}