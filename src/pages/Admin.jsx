import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";
import "../styles/admin.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

const ORDER_STATUSES = [
  "Placed",
  "Preparing",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

const PAYMENT_FILTERS = ["All", "COD", "Online"];

const STATUS_COLORS = ["#facc15", "#60a5fa", "#a855f7", "#7cff6b", "#f87171"];

export default function Admin({ setPage }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { notify } = useNotification();

  const formatDate = useCallback((dateValue) => {
    if (!dateValue) return "N/A";

    return new Date(dateValue).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, []);

  const formatDateTime = (dateValue) => {
    if (!dateValue) return "N/A";

    return new Date(dateValue).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getOrderAmount = (order) => {
    return Number(order.total || order.price || 0);
  };

  const getOrderStatus = (order) => {
    return order.status || "Placed";
  };

  const getPaymentMethod = (order) => {
    return order.payment_method || "COD";
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

  const getStatusClass = (status) => {
    return `status-badge status-${String(status || "Placed")
      .toLowerCase()
      .replaceAll(" ", "-")}`;
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/admin/orders", {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to fetch orders");
      }

      const sortedOrders = [...(json.data || [])].sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );

      setOrders(sortedOrders);
    } catch (err) {
      console.error("Fetch orders error:", err);
      notify("Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  const checkAdmin = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        notify("Login required", "error");
        setPage("admin-login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();

      if (error) {
        console.error("Profile fetch error:", error.message);
        notify("Unable to verify admin", "error");
        setPage("home");
        return;
      }

      if (profile?.role !== "admin") {
        notify("Access denied ❌", "error");
        setPage("home");
        return;
      }

      fetchOrders();
    } catch (error) {
      console.error("Admin check error:", error);
      notify("Something went wrong", "error");
      setPage("home");
    }
  }, [fetchOrders, notify, setPage]);

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update status");
      }

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

      setSelectedOrder((prev) =>
        prev?.id === orderId ? { ...prev, status: newStatus } : prev
      );

      notify("Order status updated ✅", "success");
    } catch (error) {
      console.error("Status update error:", error);
      notify("Failed to update order status", "error");
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setPage("home");
  };

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const status = getOrderStatus(order);
      const payment = getPaymentMethod(order);

      const matchesStatus = statusFilter === "All" || status === statusFilter;

      const matchesPayment =
        paymentFilter === "All" ||
        payment.toLowerCase().includes(paymentFilter.toLowerCase());

      const orderItems = getOrderItems(order)
        .map((item) => getItemName(item))
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query ||
        String(order.id || "").toLowerCase().includes(query) ||
        String(order.email || "").toLowerCase().includes(query) ||
        String(order.product_name || "").toLowerCase().includes(query) ||
        String(payment || "").toLowerCase().includes(query) ||
        orderItems.includes(query);

      return matchesStatus && matchesPayment && matchesSearch;
    });
  }, [orders, searchTerm, statusFilter, paymentFilter]);

  const dashboardData = useMemo(() => {
    const revenueData = {};
    const orderCountData = {};
    const statusData = {
      Placed: 0,
      Preparing: 0,
      "Out for Delivery": 0,
      Delivered: 0,
      Cancelled: 0,
    };

    const todayKey = formatDate(new Date());

    let totalRevenue = 0;
    let todayRevenue = 0;
    let codOrders = 0;
    let onlineOrders = 0;
    let plansCount = 0;
    let productsCount = 0;

    orders.forEach((order) => {
      const date = formatDate(order.created_at);
      const amount = getOrderAmount(order);
      const status = getOrderStatus(order);
      const payment = getPaymentMethod(order).toLowerCase();
      const items = getOrderItems(order);

      totalRevenue += amount;

      revenueData[date] = (revenueData[date] || 0) + amount;
      orderCountData[date] = (orderCountData[date] || 0) + 1;

      if (statusData[status] !== undefined) {
        statusData[status] += 1;
      }

      if (date === todayKey) {
        todayRevenue += amount;
      }

      if (payment.includes("cod")) codOrders += 1;
      if (payment.includes("online")) onlineOrders += 1;

      items.forEach((item) => {
        if (item.isPlan) plansCount += Number(item.qty || 1);
        else productsCount += Number(item.qty || 1);
      });
    });

    const revenueChart = Object.keys(revenueData).map((date) => ({
      date,
      revenue: revenueData[date],
    }));

    const ordersChart = Object.keys(orderCountData).map((date) => ({
      date,
      orders: orderCountData[date],
    }));

    const statusChart = Object.keys(statusData).map((name) => ({
      name,
      value: statusData[name],
    }));

    const todayOrders = orders.filter(
      (order) => formatDate(order.created_at) === todayKey
    );

    const activeOrders =
      statusData.Placed +
      statusData.Preparing +
      statusData["Out for Delivery"];

    return {
      revenueChart,
      ordersChart,
      statusChart,
      totalRevenue,
      statusData,
      todayOrders,
      todayRevenue,
      codOrders,
      onlineOrders,
      activeOrders,
      plansCount,
      productsCount,
    };
  }, [orders, formatDate]);

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <div>
            <p className="admin-eyebrow">Dashboard</p>
            <h2>Admin Panel</h2>
          </div>
        </div>

        <div className="admin-stats">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card">
              <div className="home-skeleton-text loading" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <p className="admin-eyebrow">Dashboard</p>
          <h2>NutriBlend Admin Panel</h2>
        </div>

        <div className="admin-header-actions">
          <button className="refresh-btn" onClick={fetchOrders}>
            Refresh
          </button>

          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <span className="stat-icon">📦</span>
          <h3>{orders.length}</h3>
          <p>Total Orders</p>
        </div>

        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <h3>₹{dashboardData.totalRevenue.toLocaleString("en-IN")}</h3>
          <p>Total Revenue</p>
        </div>

        <div className="stat-card">
          <span className="stat-icon">⏳</span>
          <h3>{dashboardData.activeOrders}</h3>
          <p>Active Orders</p>
        </div>

        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <h3>{dashboardData.statusData.Delivered}</h3>
          <p>Delivered</p>
        </div>
      </div>

      <div className="admin-stats admin-stats-secondary">
        <div className="stat-card">
          <span className="stat-icon">📅</span>
          <h3>{dashboardData.todayOrders.length}</h3>
          <p>Today Orders</p>
        </div>

        <div className="stat-card">
          <span className="stat-icon">💸</span>
          <h3>₹{dashboardData.todayRevenue.toLocaleString("en-IN")}</h3>
          <p>Today Revenue</p>
        </div>

        <div className="stat-card">
          <span className="stat-icon">💵</span>
          <h3>{dashboardData.codOrders}</h3>
          <p>COD Orders</p>
        </div>

        <div className="stat-card">
          <span className="stat-icon">💳</span>
          <h3>{dashboardData.onlineOrders}</h3>
          <p>Online Orders</p>
        </div>
      </div>

      <div className="admin-stats admin-stats-secondary">
        <div className="stat-card">
          <span className="stat-icon">🥤</span>
          <h3>{dashboardData.productsCount}</h3>
          <p>Product Qty</p>
        </div>

        <div className="stat-card">
          <span className="stat-icon">📅</span>
          <h3>{dashboardData.plansCount}</h3>
          <p>Plan Qty</p>
        </div>

        <div className="stat-card">
          <span className="stat-icon">🔎</span>
          <h3>{filteredOrders.length}</h3>
          <p>Filtered Results</p>
        </div>

        <div className="stat-card">
          <span className="stat-icon">❌</span>
          <h3>{dashboardData.statusData.Cancelled}</h3>
          <p>Cancelled</p>
        </div>
      </div>

      {orders.length > 0 && (
        <div className="charts-grid">
          <div className="chart-card">
            <h3>📈 Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dashboardData.revenueChart}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.08)"
                />
                <XAxis dataKey="date" stroke="#8ba2be" fontSize={12} />
                <YAxis stroke="#8ba2be" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "#0c1a30",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#ffffff",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#7cff6b"
                  strokeWidth={3}
                  dot={{ fill: "#7cff6b" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>📦 Orders Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dashboardData.ordersChart}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.08)"
                />
                <XAxis dataKey="date" stroke="#8ba2be" fontSize={12} />
                <YAxis stroke="#8ba2be" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "#0c1a30",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#ffffff",
                  }}
                />
                <Bar dataKey="orders" fill="#60a5fa" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card full-width">
            <h3>🥧 Order Status Overview</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={dashboardData.statusChart}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={95}
                  label
                >
                  {dashboardData.statusChart.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0c1a30",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#ffffff",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="admin-controls">
        <input
          className="admin-search"
          type="text"
          placeholder="Search by order ID, email, product, payment, or item..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          className="admin-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Status</option>
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          className="admin-filter"
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
        >
          {PAYMENT_FILTERS.map((payment) => (
            <option key={payment} value={payment}>
              {payment === "All" ? "All Payments" : payment}
            </option>
          ))}
        </select>

        {(searchTerm || statusFilter !== "All" || paymentFilter !== "All") && (
          <button
            className="admin-clear-filter-btn"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("All");
              setPaymentFilter("All");
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="orders-section">
        <h3>Recent Orders</h3>

        {filteredOrders.length === 0 ? (
          <div className="admin-empty">
            <p>No matching orders found</p>
          </div>
        ) : (
          <div className="orders-table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Current Status</th>
                  <th>Update Status</th>
                  <th>Details</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => {
                  const orderItems = getOrderItems(order);
                  const firstItem = orderItems[0];

                  return (
                    <tr key={order.id}>
                      <td>
                        <span className="order-id">#{order.id}</span>
                      </td>

                      <td>{formatDate(order.created_at)}</td>

                      <td>
                        <div className="customer-email">
                          {order.email || "No email"}
                        </div>
                      </td>

                      <td>
                        {orderItems.length > 1
                          ? `${orderItems.length} items order`
                          : getItemName(firstItem)}
                      </td>

                      <td>{order.qty || orderItems.length || 1}</td>

                      <td>
                        <span className="order-total">
                          ₹{getOrderAmount(order).toLocaleString("en-IN")}
                        </span>
                      </td>

                      <td>
                        <span className="payment-badge">
                          {getPaymentMethod(order)}
                        </span>
                      </td>

                      <td>
                        <span className={getStatusClass(order.status)}>
                          {getOrderStatus(order)}
                        </span>
                      </td>

                      <td>
                        <select
                          value={getOrderStatus(order)}
                          onChange={(e) =>
                            updateOrderStatus(order.id, e.target.value)
                          }
                          className="status-select"
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td>
                        <button
                          className="view-order-btn"
                          onClick={() => setSelectedOrder(order)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="order-modal-overlay">
          <div className="order-modal">
            <div className="order-modal-header">
              <div>
                <p className="admin-eyebrow">Order Details</p>
                <h3>Order #{selectedOrder.id}</h3>
              </div>

              <button
                className="modal-close-btn"
                onClick={() => setSelectedOrder(null)}
              >
                ✕
              </button>
            </div>

            <div className="order-modal-grid">
              <div className="modal-info-card">
                <span>Customer Email</span>
                <strong>{selectedOrder.email || "N/A"}</strong>
              </div>

              <div className="modal-info-card">
                <span>Customer Name</span>
                <strong>{selectedOrder.address?.name || "N/A"}</strong>
              </div>

              <div className="modal-info-card">
                <span>Phone</span>
                <strong>{selectedOrder.address?.phone || "N/A"}</strong>
              </div>

              <div className="modal-info-card">
                <span>Payment</span>
                <strong>{getPaymentMethod(selectedOrder)}</strong>
              </div>

              <div className="modal-info-card">
                <span>Status</span>
                <strong>{getOrderStatus(selectedOrder)}</strong>
              </div>

              <div className="modal-info-card">
                <span>Total</span>
                <strong>
                  ₹{getOrderAmount(selectedOrder).toLocaleString("en-IN")}
                </strong>
              </div>
            </div>

            <div className="modal-section">
              <h4>Order Items</h4>

              <div className="admin-order-items-list">
                {getOrderItems(selectedOrder).map((item, index) => (
                  <div className="admin-order-item" key={item.id || index}>
                    <div>
                      <strong>{getItemName(item)}</strong>

                      {item.isPlan && (
                        <span className="admin-plan-chip">Plan</span>
                      )}

                      <p>
                        Qty: {item.qty || 1} • ₹{item.price || 0}
                      </p>

                      {item.isPlan && (
                        <p>
                          Duration:{" "}
                          {item.duration || item.plan_duration || "N/A"} •
                          Protein: {item.protein || "N/A"}
                        </p>
                      )}
                    </div>

                    <span>₹{getItemSubtotal(item)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-section">
              <h4>Delivery Address</h4>
              <p>
                {selectedOrder.address?.street || "No street"},{" "}
                {selectedOrder.address?.city || "No city"},{" "}
                {selectedOrder.address?.state || ""}
              </p>
              <p>
                <strong>Pincode:</strong>{" "}
                {selectedOrder.address?.pincode || "N/A"}
              </p>
            </div>

            <div className="modal-section">
              <h4>Order Date</h4>
              <p>{formatDateTime(selectedOrder.created_at)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}