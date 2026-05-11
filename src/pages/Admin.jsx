import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";
import AdminProducts from "../components/AdminProducts";
import AdminPlans from "../components/AdminPlans";
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
const DATE_FILTERS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

const STATUS_COLORS = ["#facc15", "#60a5fa", "#a855f7", "#7cff6b", "#f87171"];

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatOrderId = (id) => {
  if (!id) return "NB-000000";

  const value = String(id);

  if (/^\d+$/.test(value)) {
    return `NB-${value.padStart(6, "0")}`;
  }

  return `NB-${value.slice(-8).toUpperCase()}`;
};

const formatDate = (dateValue) => {
  if (!dateValue) return "N/A";

  return new Date(dateValue).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

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

const filterOrdersByRange = (orders, range) => {
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

const getOrderAmount = (order) => Number(order.total || order.price || 0);

const getOrderStatus = (order) => {
  const value = String(order.status || "Placed").toLowerCase();

  if (value === "placed") return "Placed";
  if (value === "preparing") return "Preparing";
  if (value === "out for delivery") return "Out for Delivery";
  if (value === "out_for_delivery") return "Out for Delivery";
  if (value === "delivered") return "Delivered";
  if (value === "cancelled") return "Cancelled";
  if (value === "canceled") return "Cancelled";

  return "Placed";
};

const getPaymentMethod = (order) => order.payment_method || "COD";

const getOrderItems = (order) => {
  if (Array.isArray(order.items) && order.items.length > 0) return order.items;

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

const getStatusClass = (status) =>
  `status-badge status-${String(status || "Placed")
    .toLowerCase()
    .replaceAll(" ", "-")}`;

const parseJSONResponse = async (res) => {
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    console.error("Non-JSON API response:", text);
    throw new Error(text || "Server returned non-JSON response");
  }
};

const csvEscape = (value) => {
  if (value === null || value === undefined) return "";
  return `"${String(value).replaceAll('"', '""')}"`;
};

const tooltipStyle = {
  background: "#0c1a30",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  color: "#ffffff",
};

export default function Admin({ setPage }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeSection, setActiveSection] = useState("dashboard");
  const [dashboardRange, setDashboardRange] = useState("all");

  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [orderDateFilter, setOrderDateFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedOrder, setSelectedOrder] = useState(null);

  const { notify } = useNotification();

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

      const json = await parseJSONResponse(res);

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

      if (error || profile?.role !== "admin") {
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

      setOrders((prev) =>
        prev.map((order) =>
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
    const dateFilteredOrders = filterOrdersByRange(orders, orderDateFilter);

    return dateFilteredOrders.filter((order) => {
      const status = getOrderStatus(order);
      const payment = getPaymentMethod(order);
      const formattedId = formatOrderId(order.id).toLowerCase();

      const itemsText = getOrderItems(order)
        .map((item) => getItemName(item))
        .join(" ")
        .toLowerCase();

      const matchesStatus = statusFilter === "All" || status === statusFilter;

      const matchesPayment =
        paymentFilter === "All" ||
        payment.toLowerCase().includes(paymentFilter.toLowerCase());

      const matchesSearch =
        !query ||
        formattedId.includes(query) ||
        String(order.id || "").toLowerCase().includes(query) ||
        String(order.email || "").toLowerCase().includes(query) ||
        String(order.product_name || "").toLowerCase().includes(query) ||
        String(order.address?.name || "").toLowerCase().includes(query) ||
        String(order.address?.phone || "").toLowerCase().includes(query) ||
        String(order.cancel_reason || "").toLowerCase().includes(query) ||
        String(payment || "").toLowerCase().includes(query) ||
        itemsText.includes(query);

      return matchesStatus && matchesPayment && matchesSearch;
    });
  }, [orders, searchTerm, statusFilter, paymentFilter, orderDateFilter]);

  const dashboard = useMemo(() => {
    const dashboardOrders = filterOrdersByRange(orders, dashboardRange);
    const revenueData = {};
    const orderCountData = {};
    const statusData = Object.fromEntries(
      ORDER_STATUSES.map((status) => [status, 0])
    );

    const todayKey = formatDate(new Date());

    let totalRevenue = 0;
    let todayRevenue = 0;
    let codOrders = 0;
    let onlineOrders = 0;
    let planQty = 0;
    let productQty = 0;

    dashboardOrders.forEach((order) => {
      const date = formatDate(order.created_at);
      const amount = getOrderAmount(order);
      const status = getOrderStatus(order);
      const payment = getPaymentMethod(order).toLowerCase();

      totalRevenue += amount;
      revenueData[date] = (revenueData[date] || 0) + amount;
      orderCountData[date] = (orderCountData[date] || 0) + 1;

      if (statusData[status] !== undefined) statusData[status] += 1;
      if (date === todayKey) todayRevenue += amount;
      if (payment.includes("cod")) codOrders += 1;
      if (payment.includes("online")) onlineOrders += 1;

      getOrderItems(order).forEach((item) => {
        const qty = Number(item.qty || 1);
        if (item.isPlan) planQty += qty;
        else productQty += qty;
      });
    });

    const todayOrders = dashboardOrders.filter(
      (order) => formatDate(order.created_at) === todayKey
    );

    return {
      dashboardOrders,
      range: dashboardRange,
      totalRevenue,
      todayRevenue,
      todayOrders,
      codOrders,
      onlineOrders,
      planQty,
      productQty,
      activeOrders:
        statusData.Placed +
        statusData.Preparing +
        statusData["Out for Delivery"],
      statusData,
      revenueChart: Object.entries(revenueData).map(([date, revenue]) => ({
        date,
        revenue,
      })),
      ordersChart: Object.entries(orderCountData).map(([date, count]) => ({
        date,
        orders: count,
      })),
      statusChart: Object.entries(statusData).map(([name, value]) => ({
        name,
        value,
      })),
    };
  }, [orders, dashboardRange]);

  const statCards = useMemo(
    () => [
      ["📦", dashboard.dashboardOrders.length, "Range Orders"],
      ["💰", money(dashboard.totalRevenue), "Range Revenue"],
      ["⏳", dashboard.activeOrders, "Active Orders"],
      ["✅", dashboard.statusData.Delivered, "Delivered"],
      ["📅", dashboard.todayOrders.length, "Today Orders"],
      ["💸", money(dashboard.todayRevenue), "Today Revenue"],
      ["💵", dashboard.codOrders, "COD Orders"],
      ["💳", dashboard.onlineOrders, "Online Orders"],
      ["🥤", dashboard.productQty, "Product Qty"],
      ["📅", dashboard.planQty, "Plan Qty"],
      ["🔎", filteredOrders.length, "Filtered Results"],
      ["❌", dashboard.statusData.Cancelled, "Cancelled"],
    ],
    [dashboard, filteredOrders.length]
  );

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setPaymentFilter("All");
    setOrderDateFilter("all");
  };

  const exportOrdersToCSV = () => {
    if (!filteredOrders.length) {
      notify("No orders available to export", "error");
      return;
    }

    const headers = [
      "Order ID",
      "Date",
      "Customer Email",
      "Customer Name",
      "Phone",
      "Address",
      "Items",
      "Total Quantity",
      "Total Amount",
      "Payment Method",
      "Payment Status",
      "Order Status",
      "Cancel Reason",
      "Cancelled At",
    ];

    const rows = filteredOrders.map((order) => {
      const items = getOrderItems(order);

      const itemsText = items
        .map((item) => {
          const type = item.isPlan ? "Plan" : "Product";
          return `${getItemName(item)} (${type}) x ${item.qty || 1} - ₹${
            item.price || 0
          }`;
        })
        .join(" | ");

      const totalQty = items.reduce(
        (sum, item) => sum + Number(item.qty || 1),
        0
      );

      const address = order.address
        ? [
            order.address.name,
            order.address.phone,
            order.address.street,
            order.address.city,
            order.address.state,
            order.address.pincode,
          ]
            .filter(Boolean)
            .join(", ")
        : "N/A";

      return [
        formatOrderId(order.id),
        formatDate(order.created_at),
        order.email || "N/A",
        order.address?.name || "N/A",
        order.address?.phone || "N/A",
        address,
        itemsText,
        totalQty,
        getOrderAmount(order),
        getPaymentMethod(order),
        order.payment_status || "N/A",
        getOrderStatus(order),
        order.cancel_reason || "N/A",
        order.cancelled_at ? formatDateTime(order.cancelled_at) : "N/A",
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `nutriblend-orders-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    notify("Orders exported successfully ✅", "success");
  };

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
            Refresh Orders
          </button>

          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <AdminSectionNav
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        ordersCount={orders.length}
        filteredCount={filteredOrders.length}
      />

      {activeSection === "dashboard" && (
        <DashboardSection
          dashboard={dashboard}
          statCards={statCards}
          dashboardRange={dashboardRange}
          setDashboardRange={setDashboardRange}
        />
      )}

      {activeSection === "orders" && (
        <OrdersSection
          filteredOrders={filteredOrders}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          paymentFilter={paymentFilter}
          setPaymentFilter={setPaymentFilter}
          orderDateFilter={orderDateFilter}
          setOrderDateFilter={setOrderDateFilter}
          resetFilters={resetFilters}
          exportOrdersToCSV={exportOrdersToCSV}
          updateOrderStatus={updateOrderStatus}
          setSelectedOrder={setSelectedOrder}
        />
      )}

      {activeSection === "products" && <AdminProducts notify={notify} />}
      {activeSection === "plans" && <AdminPlans notify={notify} />}

      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}

function AdminSectionNav({
  activeSection,
  setActiveSection,
  ordersCount,
  filteredCount,
}) {
  const sections = [
    {
      key: "dashboard",
      icon: "📊",
      title: "Dashboard",
      desc: "Analytics & reports",
    },
    {
      key: "orders",
      icon: "📦",
      title: "Orders",
      desc: `${filteredCount}/${ordersCount} visible`,
    },
    {
      key: "products",
      icon: "🥤",
      title: "Products",
      desc: "Add, edit & stock",
    },
    {
      key: "plans",
      icon: "📅",
      title: "Plans",
      desc: "Subscriptions",
    },
  ];

  return (
    <div className="admin-section-nav">
      {sections.map((section) => (
        <button
          key={section.key}
          className={activeSection === section.key ? "active" : ""}
          onClick={() => setActiveSection(section.key)}
        >
          <span>{section.icon}</span>

          <div>
            <strong>{section.title}</strong>
            <small>{section.desc}</small>
          </div>
        </button>
      ))}
    </div>
  );
}

function DashboardSection({
  dashboard,
  statCards,
  dashboardRange,
  setDashboardRange,
}) {
  return (
    <>
      <div className="admin-dashboard-filter">
        <div>
          <p className="admin-eyebrow">Analytics Range</p>
          <h3>Dashboard Overview</h3>
        </div>

        <RangeButtons
          value={dashboardRange}
          onChange={setDashboardRange}
          compact={false}
        />
      </div>

      <div className="admin-stats">
        {statCards.map(([icon, value, label], index) => (
          <div
            key={label}
            className={`stat-card ${index >= 4 ? "stat-card-secondary" : ""}`}
          >
            <span className="stat-icon">{icon}</span>
            <h3>{value}</h3>
            <p>{label}</p>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <ChartCard title="📈 Revenue Trend">
          <LineChart data={dashboard.revenueChart}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.08)"
            />
            <XAxis dataKey="date" stroke="#8ba2be" fontSize={12} />
            <YAxis stroke="#8ba2be" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#7cff6b"
              strokeWidth={3}
              dot={{ fill: "#7cff6b" }}
            />
          </LineChart>
        </ChartCard>

        <ChartCard title="📦 Orders Trend">
          <BarChart data={dashboard.ordersChart}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.08)"
            />
            <XAxis dataKey="date" stroke="#8ba2be" fontSize={12} />
            <YAxis stroke="#8ba2be" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="orders" fill="#60a5fa" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartCard>

        <div className="chart-card full-width">
          <h3>🥧 Order Status Overview</h3>

          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={dashboard.statusChart}
                dataKey="value"
                nameKey="name"
                outerRadius={95}
                label
              >
                {dashboard.statusChart.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                  />
                ))}
              </Pie>

              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

function OrdersSection({
  filteredOrders,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  paymentFilter,
  setPaymentFilter,
  orderDateFilter,
  setOrderDateFilter,
  resetFilters,
  exportOrdersToCSV,
  updateOrderStatus,
  setSelectedOrder,
}) {
  const filtersActive =
    searchTerm ||
    statusFilter !== "All" ||
    paymentFilter !== "All" ||
    orderDateFilter !== "all";

  return (
    <>
      <div className="admin-controls">
        <input
          className="admin-search"
          type="text"
          placeholder="Search NB-000055, email, name, phone, cancel reason, product..."
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

        <select
          className="admin-filter"
          value={orderDateFilter}
          onChange={(e) => setOrderDateFilter(e.target.value)}
        >
          {DATE_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>

        {filtersActive && (
          <button className="admin-clear-filter-btn" onClick={resetFilters}>
            Clear Filters
          </button>
        )}

        <button
          className="admin-export-btn"
          onClick={exportOrdersToCSV}
          disabled={filteredOrders.length === 0}
        >
          Export CSV
        </button>
      </div>

      <div className="orders-section">
        <div className="orders-section-head">
          <div>
            <h3>Recent Orders</h3>
            <p>{filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""} found</p>
          </div>
        </div>

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
                  const items = getOrderItems(order);
                  const firstItem = items[0];
                  const status = getOrderStatus(order);

                  return (
                    <tr key={order.id}>
                      <td>
                        <span className="order-id">
                          {formatOrderId(order.id)}
                        </span>
                      </td>

                      <td>{formatDate(order.created_at)}</td>

                      <td>
                        <div className="customer-email">
                          <strong>{order.address?.name || "Customer"}</strong>
                          <span>{order.email || "No email"}</span>
                          <span>{order.address?.phone || "No phone"}</span>
                        </div>
                      </td>

                      <td>
                        {items.length > 1
                          ? `${items.length} items order`
                          : getItemName(firstItem)}
                      </td>

                      <td>{order.qty || items.length || 1}</td>

                      <td>
                        <span className="order-total">
                          {money(getOrderAmount(order))}
                        </span>
                      </td>

                      <td>
                        <span className="payment-badge">
                          {getPaymentMethod(order)}
                        </span>
                      </td>

                      <td>
                        <span className={getStatusClass(status)}>{status}</span>
                      </td>

                      <td>
                        <select
                          value={status}
                          onChange={(e) =>
                            updateOrderStatus(order.id, e.target.value)
                          }
                          className="status-select"
                        >
                          {ORDER_STATUSES.map((statusOption) => (
                            <option key={statusOption} value={statusOption}>
                              {statusOption}
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
    </>
  );
}

function RangeButtons({ value, onChange }) {
  return (
    <div className="admin-range-buttons">
      {DATE_FILTERS.map((filter) => (
        <button
          key={filter.value}
          className={value === filter.value ? "active" : ""}
          onClick={() => onChange(filter.value)}
          type="button"
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="chart-card">
      <h3>{title}</h3>

      <ResponsiveContainer width="100%" height={250}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function OrderModal({ order, onClose }) {
  const items = getOrderItems(order);
  const status = getOrderStatus(order);
  const isCancelled = status === "Cancelled";

  return (
    <div className="order-modal-overlay">
      <div className="order-modal">
        <div className="order-modal-header">
          <div>
            <p className="admin-eyebrow">Order Details</p>
            <h3>{formatOrderId(order.id)}</h3>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {isCancelled && (
          <div className="admin-cancelled-warning">
            <strong>❌ This order was cancelled</strong>

            <p>
              <span>Reason:</span>{" "}
              {order.cancel_reason || "No reason provided"}
            </p>

            <p>
              <span>Cancelled At:</span>{" "}
              {order.cancelled_at ? formatDateTime(order.cancelled_at) : "N/A"}
            </p>
          </div>
        )}

        <div className="order-modal-grid">
          <InfoCard label="Customer Email" value={order.email || "N/A"} />
          <InfoCard label="Customer Name" value={order.address?.name || "N/A"} />
          <InfoCard label="Phone" value={order.address?.phone || "N/A"} />
          <InfoCard label="Payment" value={getPaymentMethod(order)} />
          <InfoCard label="Status" value={status} />
          <InfoCard label="Total" value={money(getOrderAmount(order))} />
        </div>

        <div className="modal-section">
          <h4>Order Items</h4>

          <div className="admin-order-items-list">
            {items.map((item, index) => (
              <div className="admin-order-item" key={item.id || index}>
                <div>
                  <strong>{getItemName(item)}</strong>

                  {item.isPlan && <span className="admin-plan-chip">Plan</span>}

                  <p>
                    Qty: {item.qty || 1} • {money(item.price || 0)}
                  </p>

                  {item.isPlan && (
                    <p>
                      Duration: {item.duration || item.plan_duration || "N/A"} •
                      Protein: {item.protein || "N/A"}
                    </p>
                  )}
                </div>

                <span>{money(getItemSubtotal(item))}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-section">
          <h4>Delivery Address</h4>

          <p>
            <strong>Name:</strong> {order.address?.name || "N/A"}
          </p>

          <p>
            <strong>Phone:</strong> {order.address?.phone || "N/A"}
          </p>

          <p>
            {order.address?.street || "No street"},{" "}
            {order.address?.city || "No city"}, {order.address?.state || ""}
          </p>

          <p>
            <strong>Pincode:</strong> {order.address?.pincode || "N/A"}
          </p>
        </div>

        <div className="modal-section">
          <h4>Order Date</h4>
          <p>{formatDateTime(order.created_at)}</p>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="modal-info-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
