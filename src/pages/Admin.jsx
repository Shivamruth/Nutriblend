import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";
import "../styles/admin.css";
import "../styles/admin-analytics.css";

const AdminProducts = lazy(() => import("../components/AdminProducts"));
const AdminPlans    = lazy(() => import("../components/AdminPlans"));
const AdminAnalytics = lazy(() => import("../components/AdminAnalytics"));

const AdminTabLoader = () => (
  <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
    Loading...
  </div>
);

const ORDER_STATUSES = [
  "Pending",
  "Preparing",
  "Ready for Pickup",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

const DELIVERY_STATUSES = ORDER_STATUSES;
const PAYMENT_STATUSES = ["Pending", "Paid", "Failed", "Refunded"];
const STATUS_FILTERS = ["All", ...ORDER_STATUSES];
const PAYMENT_STATUS_FILTERS = ["All", ...PAYMENT_STATUSES];
const PAYMENT_METHOD_FILTERS = ["All", "COD", "UPI", "Razorpay", "Online"];
const ADMIN_TABS = [
  { id: "orders", label: "Orders" },
  { id: "products", label: "Products" },
  { id: "plans", label: "Plans" },
  { id: "inquiries", label: "Inquiries" },
  { id: "analytics", label: "Analytics" },
];

const money = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

const formatOrderId = (id) => {
  if (!id) return "NB-000000";
  const value = String(id);
  if (/^\d+$/.test(value)) return `NB-${value.padStart(6, "0")}`;
  return `NB-${value.slice(-8).toUpperCase()}`;
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

const isToday = (dateValue) => {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return date.toDateString() === new Date().toDateString();
};

const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const safeObject = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (!value || typeof value !== "string") return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
};

const normalizeStatus = (status) => {
  const value = String(status || "Pending")
    .toLowerCase()
    .replaceAll("_", " ")
    .trim();

  if (value === "placed" || value === "pending") return "Pending";
  if (value === "preparing") return "Preparing";
  if (value === "ready" || value === "ready for pickup") return "Ready for Pickup";
  if (value === "out for delivery") return "Out for Delivery";
  if (value === "delivered") return "Delivered";
  if (value === "cancelled" || value === "canceled") return "Cancelled";
  return "Pending";
};

const normalizePaymentStatus = (status) => {
  const value = String(status || "Pending").toLowerCase().trim();
  if (value === "paid") return "Paid";
  if (value === "failed") return "Failed";
  if (value === "refunded") return "Refunded";
  return "Pending";
};

const normalizePaymentMethod = (method) => {
  const value = String(method || "COD").trim();
  if (!value) return "COD";
  if (value.toLowerCase() === "online") return "Razorpay";
  return value;
};

const getOrderItems = (order) => {
  const items = safeArray(order.items);
  if (items.length) return items;

  return [
    {
      id: order.id,
      name: order.product_name || "NutriBlend Order",
      price: Number(order.price || order.total || 0),
      qty: Number(order.qty || 1),
    },
  ];
};

const getItemName = (item) =>
  item.name || item.product_name || item.title || "NutriBlend Item";

const getItemQty = (item) => Number(item.qty || item.quantity || 1);
const getItemPrice = (item) => Number(item.price || item.amount || 0);
const getItemSubtotal = (item) => getItemQty(item) * getItemPrice(item);
const getOrderTotal = (order) => Number(order.total || order.price || 0);

const getOrderQty = (order) =>
  getOrderItems(order).reduce((sum, item) => sum + getItemQty(item), 0);

const getAddressText = (address) =>
  [
    address.street,
    address.landmark ? `Near ${address.landmark}` : "",
    address.city,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(", ");

const getStatusClass = (status) =>
  `admin-status-badge status-${normalizeStatus(status)
    .toLowerCase()
    .replaceAll(" ", "-")}`;

const getPaymentClass = (status) =>
  `admin-payment-status payment-${normalizePaymentStatus(status).toLowerCase()}`;

const toCoordinate = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getCustomerCoordinates = (order, address) => {
  const lat = toCoordinate(order.customer_lat ?? address.customer_lat ?? address.lat);
  const lng = toCoordinate(order.customer_lng ?? address.customer_lng ?? address.lng);

  return lat != null && lng != null ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : "Not added";
};

const getDeliveryStatusSync = (status) => {
  const normalized = normalizeStatus(status);
  const syncStatuses = ["Preparing", "Out for Delivery", "Delivered"];
  return syncStatuses.includes(normalized) ? normalized : null;
};

export default function Admin({ setPage }) {
  const { notify } = useNotification();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingKey, setUpdatingKey] = useState("");
  const [adminReady, setAdminReady] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("All");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("orders");

  // Inquiries state
  const [gymInquiries, setGymInquiries]     = useState([]);
  const [contactInquiries, setContactInquiries] = useState([]);
  const [loadingInquiries, setLoadingInquiries] = useState(false);

  // Delivery partners list
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [assigningPartner, setAssigningPartner] = useState("");

  const fetchOrders = useCallback(
    async ({ silent = false, limit = 100 } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw error;

        setOrders(data || []);
      } catch (error) {
        console.error("Admin orders fetch error:", error);
        setErrorMessage(error.message || "Unable to load admin orders.");
        notify(error.message || "Unable to load admin orders", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [notify]
  );

  const checkAdmin = useCallback(async () => {
    setLoading(true);

    try {
      // getSession is instant (cached), then verify the role for direct visits.
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (sessionError || !session?.user) {
        notify("Login required", "error");
        setPage?.("admin-login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profileError || profile?.role !== "admin") {
        notify("Access denied. Admin only.", "error");
        setPage?.("home");
        return;
      }

      setAdminReady(true);
      await fetchOrders();
    } catch (error) {
      console.error("Admin check error:", error);
      notify("Admin access check failed", "error");
      setPage?.("home");
    } finally {
      setLoading(false);
    }
  }, [fetchOrders, notify, setPage]);

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  const fetchInquiries = useCallback(async () => {
    setLoadingInquiries(true);
    try {
      const [gymRes, contactRes] = await Promise.all([
        supabase.from("gym_partner_inquiries").select("*").order("created_at", { ascending: false }),
        supabase.from("contact_inquiries").select("*").order("created_at", { ascending: false }),
      ]);
      setGymInquiries(gymRes.data || []);
      setContactInquiries(contactRes.data || []);
    } catch (err) {
      console.error("Inquiries fetch error:", err);
    } finally {
      setLoadingInquiries(false);
    }
  }, []);

  const fetchDeliveryPartners = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, phone, role")
      .eq("role", "delivery_partner")
      .order("full_name", { ascending: true });
    setDeliveryPartners(data || []);
  }, []);

  useEffect(() => {
    if (adminReady) {
      fetchInquiries();
      fetchDeliveryPartners();
    }
  }, [adminReady, fetchInquiries, fetchDeliveryPartners]);

  // ── Realtime: auto-refresh orders when new orders arrive or statuses change ──
  useEffect(() => {
    if (!adminReady) return;

    const channel = supabase
      .channel("admin:orders-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          setOrders((prev) => [payload.new, ...prev]);
          notify("New order received!", "success");
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          setOrders((prev) =>
            prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminReady, notify]);

  const assignPartner = async (orderId, partnerId) => {
    const key = `${orderId}-assign`;
    setAssigningPartner(key);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ delivery_partner_id: partnerId || null })
        .eq("id", orderId);
      if (error) throw error;
      await supabase.from("delivery_tracking").insert([{
        order_id: Number(orderId),
        delivery_partner_id: partnerId || null,
        status: "assigned",
      }]);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, delivery_partner_id: partnerId || null } : o));
      notify(partnerId ? "Delivery partner assigned" : "Assignment cleared", "success");
    } catch (err) {
      notify(err.message || "Could not assign partner", "error");
    } finally {
      setAssigningPartner("");
    }
  };

  const dashboard = useMemo(() => {
    const totalOrders = orders.length;
    const todayOrders = orders.filter((order) => isToday(order.created_at));
    const todayRevenue = todayOrders.reduce(
      (sum, order) => sum + getOrderTotal(order),
      0
    );
    const totalRevenue = orders.reduce(
      (sum, order) => sum + getOrderTotal(order),
      0
    );

    const countByStatus = (targetStatus) =>
      orders.filter((order) => normalizeStatus(order.status) === targetStatus)
        .length;

    return {
      totalOrders,
      todayOrders: todayOrders.length,
      todayRevenue,
      pendingOrders: countByStatus("Pending"),
      preparingOrders: countByStatus("Preparing"),
      outForDeliveryOrders: countByStatus("Out for Delivery"),
      deliveredOrders: countByStatus("Delivered"),
      totalRevenue,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const address = safeObject(order.address);
      const status = normalizeStatus(order.status);
      const paymentMethod = normalizePaymentMethod(order.payment_method);
      const paymentStatus = normalizePaymentStatus(order.payment_status);

      const searchText = [
        formatOrderId(order.id),
        order.id,
        order.email,
        address.phone,
        address.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchText.includes(query);
      const matchesStatus =
        statusFilter === "All" || status === statusFilter;
      const matchesPaymentMethod =
        paymentMethodFilter === "All" ||
        paymentMethod
          .toLowerCase()
          .includes(paymentMethodFilter.toLowerCase());
      const matchesPaymentStatus =
        paymentStatusFilter === "All" || paymentStatus === paymentStatusFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPaymentMethod &&
        matchesPaymentStatus
      );
    });
  }, [orders, paymentMethodFilter, paymentStatusFilter, searchTerm, statusFilter]);

  const updateOrderFields = async (orderId, payload, keySuffix = "update") => {
    const key = `${orderId}-${keySuffix}`;
    setUpdatingKey(key);

    try {
      const cleanPayload = Object.fromEntries(
        Object.entries(payload).map(([field, value]) => [
          field,
          typeof value === "string" ? value.trim() : value,
        ])
      );

      const { data, error } = await supabase
        .from("orders")
        .update(cleanPayload)
        .eq("id", orderId)
        .select("*")
        .single();

      if (error) throw error;

      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? data : order))
      );

      notify("Order updated", "success");
    } catch (error) {
      console.error("Admin update error:", error);
      notify(error.message || "Unable to update order", "error");
    } finally {
      setUpdatingKey("");
    }
  };

  const updateOrderField = async (orderId, field, value) => {
    const payload = { [field]: value };

    if (field === "status") {
      const deliveryStatus = getDeliveryStatusSync(value);
      if (deliveryStatus) payload.delivery_status = deliveryStatus;
    }

    await updateOrderFields(orderId, payload, field);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setPaymentMethodFilter("All");
    setPaymentStatusFilter("All");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setPage?.("admin-login");
  };

  if (loading && !adminReady) {
    return (
      <main className="admin-page">
        <section className="admin-hero">
          <div>
            <p className="admin-eyebrow">Admin Dashboard</p>
            <h2>Loading Admin Panel</h2>
          </div>
        </section>

        <section className="admin-dashboard-grid">
          {Array.from({ length: 8 }).map((_, index) => (
            <div className="admin-skeleton-card" key={index}>
              <span />
              <strong />
            </div>
          ))}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <section className="admin-hero">
        <div>
          <p className="admin-eyebrow">NutriBlend Control Center</p>
          <h2>Admin Dashboard</h2>
          <p>
            Manage customer orders, product catalog, inventory, and subscription
            plans from one Supabase-powered operations view.
          </p>
        </div>

        <div className="admin-hero-actions">
          <button
            type="button"
            onClick={() => fetchOrders({ silent: true })}
            disabled={refreshing || activeTab !== "orders"}
          >
            {refreshing ? "Refreshing..." : activeTab === "orders" ? "Refresh Orders" : "Open Orders to Refresh"}
          </button>
          <button type="button" className="admin-logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </section>

      <section className="admin-dashboard-grid" aria-label="Dashboard metrics">
        <MetricCard label="Total Orders" value={dashboard.totalOrders} />
        <MetricCard label="Pending Orders" value={dashboard.pendingOrders} />
        <MetricCard label="Delivered Orders" value={dashboard.deliveredOrders} />
        <MetricCard label="Total Revenue" value={money(dashboard.totalRevenue)} />
        <MetricCard label="Today Orders" value={dashboard.todayOrders} />
        <MetricCard label="Today Revenue" value={money(dashboard.todayRevenue)} />
        <MetricCard label="Preparing Orders" value={dashboard.preparingOrders} />
        <MetricCard label="Out for Delivery" value={dashboard.outForDeliveryOrders} />
      </section>

      <nav className="admin-tabs" aria-label="Admin sections">
        {ADMIN_TABS.map((tab) => (
          <button
            type="button"
            key={tab.id}
            className={activeTab === tab.id ? "active" : ""}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "orders" && (
      <section className="admin-orders-panel">
        <div className="admin-orders-head">
          <div>
            <p className="admin-eyebrow">Orders</p>
            <h3>Customer Orders</h3>
            <span>
              Showing {filteredOrders.length} of {orders.length} orders
            </span>
          </div>

          <button type="button" onClick={resetFilters}>
            Reset Filters
          </button>
        </div>

        <div className="admin-filters">
          <input
            type="search"
            placeholder="Search order ID, email, phone..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status === "All" ? "All Order Status" : status}
              </option>
            ))}
          </select>

          <select
            value={paymentMethodFilter}
            onChange={(event) => setPaymentMethodFilter(event.target.value)}
          >
            {PAYMENT_METHOD_FILTERS.map((method) => (
              <option key={method} value={method}>
                {method === "All" ? "All Payment Methods" : method}
              </option>
            ))}
          </select>

          <select
            value={paymentStatusFilter}
            onChange={(event) => setPaymentStatusFilter(event.target.value)}
          >
            {PAYMENT_STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status === "All" ? "All Payment Status" : status}
              </option>
            ))}
          </select>
        </div>

        {errorMessage ? (
          <div className="admin-state-box">
            <h3>Unable to load orders</h3>
            <p>{errorMessage}</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="admin-state-box">
            <h3>No orders found</h3>
            <p>Try changing the search or filters.</p>
          </div>
        ) : (
          <div className="admin-order-list">
            {filteredOrders.map((order) => (
              <AdminOrderCard
                key={order.id}
                order={order}
                updatingKey={updatingKey}
                onUpdate={updateOrderField}
                onUpdateFields={updateOrderFields}
                deliveryPartners={deliveryPartners}
                assigningPartner={assigningPartner}
                onAssignPartner={assignPartner}
              />
            ))}
          </div>
        )}
      </section>
      )}

      {activeTab === "products" && (
        <Suspense fallback={<AdminTabLoader />}>
          <AdminProducts notify={notify} />
        </Suspense>
      )}

      {activeTab === "plans" && (
        <Suspense fallback={<AdminTabLoader />}>
          <AdminPlans notify={notify} />
        </Suspense>
      )}

      {activeTab === "inquiries" && (
        <section className="admin-section">
          <div className="admin-section-head">
            <h3>Gym Partner Inquiries ({gymInquiries.length})</h3>
            <button type="button" onClick={fetchInquiries} disabled={loadingInquiries} style={{ fontSize: 13 }}>
              {loadingInquiries ? "Loading…" : "⟳ Refresh"}
            </button>
          </div>
          {gymInquiries.length === 0 ? (
            <div className="admin-state-box"><p>No gym inquiries yet.</p></div>
          ) : (
            <div className="admin-order-list">
              {gymInquiries.map((inq) => (
                <article key={inq.id} className="admin-order-card" style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 15 }}>{inq.gym_name}</p>
                      <p style={{ color: "var(--text-muted, #94a3b8)", fontSize: 13 }}>{inq.owner_name} · {inq.phone} · {inq.city}</p>
                      {inq.expected_daily_orders && <p style={{ fontSize: 13, marginTop: 4 }}>Expected daily orders: <strong>{inq.expected_daily_orders}</strong></p>}
                      {inq.notes && <p style={{ fontSize: 13, color: "var(--text-muted, #94a3b8)", marginTop: 4 }}>{inq.notes}</p>}
                      <p style={{ fontSize: 12, color: "var(--text-muted, #64748b)", marginTop: 6 }}>{formatDateTime(inq.created_at)}</p>
                    </div>
                    <span className="admin-status-badge" style={{ background: inq.status === "reviewed" ? "rgba(132,204,22,0.15)" : "rgba(248,113,113,0.15)", color: inq.status === "reviewed" ? "#84cc16" : "#f87171" }}>
                      {inq.status}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="admin-section-head" style={{ marginTop: 32 }}>
            <h3>Contact Inquiries ({contactInquiries.length})</h3>
          </div>
          {contactInquiries.length === 0 ? (
            <div className="admin-state-box"><p>No contact inquiries yet.</p></div>
          ) : (
            <div className="admin-order-list">
              {contactInquiries.map((inq) => (
                <article key={inq.id} className="admin-order-card" style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 15 }}>{inq.name} <span style={{ fontWeight: 400, fontSize: 13, color: "var(--text-muted, #94a3b8)" }}>{inq.email}</span></p>
                      {inq.subject && <p style={{ fontSize: 13, marginTop: 4, fontWeight: 600 }}>{inq.subject}</p>}
                      <p style={{ fontSize: 13, color: "var(--text-muted, #94a3b8)", marginTop: 4 }}>{inq.message}</p>
                      <p style={{ fontSize: 12, color: "var(--text-muted, #64748b)", marginTop: 6 }}>{formatDateTime(inq.created_at)}</p>
                    </div>
                    <span className="admin-status-badge" style={{ background: inq.status === "reviewed" ? "rgba(132,204,22,0.15)" : "rgba(248,113,113,0.15)", color: inq.status === "reviewed" ? "#84cc16" : "#f87171" }}>
                      {inq.status}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "analytics" && (
        <Suspense fallback={<AdminTabLoader />}>
          <AdminAnalytics orders={orders} dashboard={dashboard} />
        </Suspense>
      )}
    </main>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="admin-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AdminOrderCard({ order, updatingKey, onUpdate, onUpdateFields, deliveryPartners = [], assigningPartner, onAssignPartner }) {
  const address = safeObject(order.address);
  const items = getOrderItems(order);
  const orderStatus = normalizeStatus(order.status);
  const deliveryStatus = normalizeStatus(order.delivery_status || order.status);
  const paymentMethod = normalizePaymentMethod(order.payment_method);
  const paymentStatus = normalizePaymentStatus(order.payment_status);
  const quantity = getOrderQty(order);
  const addressText = getAddressText(address) || "Address not available";
  const customerCoordinates = getCustomerCoordinates(order, address);
  const [deliveryForm, setDeliveryForm] = useState({
    delivery_status: deliveryStatus,
    delivery_partner_name: order.delivery_partner_name || "",
    delivery_partner_phone: order.delivery_partner_phone || "",
    estimated_delivery_time: order.estimated_delivery_time || "",
    delivery_lat: order.delivery_lat ?? "",
    delivery_lng: order.delivery_lng ?? "",
  });

  useEffect(() => {
    setDeliveryForm({
      delivery_status: deliveryStatus,
      delivery_partner_name: order.delivery_partner_name || "",
      delivery_partner_phone: order.delivery_partner_phone || "",
      estimated_delivery_time: order.estimated_delivery_time || "",
      delivery_lat: order.delivery_lat ?? "",
      delivery_lng: order.delivery_lng ?? "",
    });
  }, [
    deliveryStatus,
    order.delivery_lat,
    order.delivery_lng,
    order.delivery_partner_name,
    order.delivery_partner_phone,
    order.estimated_delivery_time,
  ]);

  const updateDeliveryForm = (field, value) => {
    setDeliveryForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveDeliveryDetails = () => {
    onUpdateFields(order.id, {
      delivery_status: deliveryForm.delivery_status,
      delivery_partner_name: deliveryForm.delivery_partner_name,
      delivery_partner_phone: deliveryForm.delivery_partner_phone,
      estimated_delivery_time: deliveryForm.estimated_delivery_time,
      delivery_lat: deliveryForm.delivery_lat === "" ? null : deliveryForm.delivery_lat,
      delivery_lng: deliveryForm.delivery_lng === "" ? null : deliveryForm.delivery_lng,
    }, "delivery-details");
  };

  return (
    <article className="admin-order-card">
      <header className="admin-order-top">
        <div>
          <p className="admin-order-label">Order ID</p>
          <h3>{formatOrderId(order.id)}</h3>
          <span>{formatDateTime(order.created_at)}</span>
        </div>

        <div className="admin-order-badges">
          <span className={getStatusClass(orderStatus)}>{orderStatus}</span>
          <span className={getPaymentClass(paymentStatus)}>
            {paymentStatus}
          </span>
        </div>
      </header>

      <div className="admin-order-grid">
        <InfoBlock label="Customer Email" value={order.email || "N/A"} />
        <InfoBlock label="Phone" value={address.phone || "N/A"} />
        <InfoBlock label="Quantity" value={quantity} />
        <InfoBlock label="Total Amount" value={money(getOrderTotal(order))} highlight />
        <InfoBlock label="Payment Method" value={paymentMethod} />
        <InfoBlock label="Payment Status" value={paymentStatus} />
        <InfoBlock label="Order Status" value={orderStatus} />
        <InfoBlock label="Delivery Status" value={deliveryStatus} />
        <InfoBlock label="Delivery Partner Name" value={order.delivery_partner_name || "Not assigned"} />
        <InfoBlock label="Delivery Partner Phone" value={order.delivery_partner_phone || "Not assigned"} />
        <InfoBlock label="Estimated Delivery Time" value={order.estimated_delivery_time || "Not set"} />
        <InfoBlock label="Customer Coordinates" value={customerCoordinates} />
        <InfoBlock label="Created Date" value={formatDateTime(order.created_at)} />
      </div>

      <section className="admin-order-items">
        <div className="admin-order-section-head">
          <h4>Ordered Items</h4>
          <span>{items.length} item{items.length === 1 ? "" : "s"}</span>
        </div>

        <div className="admin-order-item-list">
          {items.map((item, index) => (
            <div className="admin-order-item-row" key={item.id || `${order.id}-${index}`}>
              <div>
                <strong>{getItemName(item)}</strong>
                <p>
                  Qty {getItemQty(item)} x {money(getItemPrice(item))}
                </p>
              </div>
              <span>{money(getItemSubtotal(item))}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-address-box">
        <p className="admin-order-label">Delivery Address</p>
        <strong>{address.name || "Customer"}</strong>
        <p>{addressText}</p>
      </section>

      <section className="admin-delivery-controls">
        <div className="admin-order-section-head">
          <h4>Delivery Controls</h4>
          <span>Assign partner and tracking</span>
        </div>

        <div className="admin-delivery-grid">
          {deliveryPartners.length > 0 && (
            <label>
              Assign Delivery Partner
              <select
                value={order.delivery_partner_id || ""}
                disabled={assigningPartner === `${order.id}-assign`}
                onChange={(e) => onAssignPartner?.(order.id, e.target.value || null)}
              >
                <option value="">— Unassigned —</option>
                {deliveryPartners.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name || p.id} {p.phone ? `· ${p.phone}` : ""}</option>
                ))}
              </select>
            </label>
          )}

          <label>
            Delivery Status
            <select
              value={deliveryForm.delivery_status}
              onChange={(event) => updateDeliveryForm("delivery_status", event.target.value)}
            >
              {DELIVERY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label>
            Delivery Partner Name
            <input
              value={deliveryForm.delivery_partner_name}
              onChange={(event) => updateDeliveryForm("delivery_partner_name", event.target.value)}
              placeholder="Delivery partner name"
            />
          </label>

          <label>
            Delivery Partner Phone
            <input
              value={deliveryForm.delivery_partner_phone}
              onChange={(event) => updateDeliveryForm("delivery_partner_phone", event.target.value.replace(/\D/g, ""))}
              inputMode="tel"
              maxLength="15"
              placeholder="Phone number"
            />
          </label>

          <label>
            Estimated Delivery Time
            <input
              value={deliveryForm.estimated_delivery_time}
              onChange={(event) => updateDeliveryForm("estimated_delivery_time", event.target.value)}
              placeholder="Example: 30-45 minutes"
            />
          </label>

          <label>
            Delivery Latitude
            <input
              value={deliveryForm.delivery_lat}
              onChange={(event) => updateDeliveryForm("delivery_lat", event.target.value)}
              inputMode="decimal"
              placeholder="Optional"
            />
          </label>

          <label>
            Delivery Longitude
            <input
              value={deliveryForm.delivery_lng}
              onChange={(event) => updateDeliveryForm("delivery_lng", event.target.value)}
              inputMode="decimal"
              placeholder="Optional"
            />
          </label>
        </div>

        <button
          type="button"
          className="admin-save-delivery-btn"
          onClick={saveDeliveryDetails}
          disabled={updatingKey === `${order.id}-delivery-details`}
        >
          {updatingKey === `${order.id}-delivery-details` ? "Saving..." : "Save Delivery Details"}
        </button>
      </section>

      <div className="admin-update-grid">
        <label>
          Update Order Status
          <select
            value={orderStatus}
            disabled={updatingKey === `${order.id}-status`}
            onChange={(event) => onUpdate(order.id, "status", event.target.value)}
          >
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label>
          Update Payment Status
          <select
            value={paymentStatus}
            disabled={updatingKey === `${order.id}-payment_status`}
            onChange={(event) =>
              onUpdate(order.id, "payment_status", event.target.value)
            }
          >
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>
    </article>
  );
}

function InfoBlock({ label, value, highlight = false }) {
  return (
    <div className="admin-info-block">
      <span>{label}</span>
      <strong className={highlight ? "highlight" : ""}>{value}</strong>
    </div>
  );
}
