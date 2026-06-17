/**
 * AdminAnalytics — Rich analytics charts using Recharts.
 * Renders inside the Admin "analytics" tab.
 */
import { useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = {
  primary:  "#5f7a61",
  accent:   "#c96f4a",
  success:  "#22c55e",
  danger:   "#ef4444",
  info:     "#06b6d4",
  warning:  "#eab308",
  purple:   "#a855f7",
  blue:     "#3b82f6",
};

const STATUS_COLORS = {
  Pending:             COLORS.warning,
  Preparing:           COLORS.info,
  "Ready for Pickup":  COLORS.purple,
  "Out for Delivery":  COLORS.blue,
  Delivered:           COLORS.success,
  Cancelled:           COLORS.danger,
};

const PAYMENT_COLORS = {
  COD:      COLORS.accent,
  Razorpay: COLORS.primary,
  UPI:      COLORS.purple,
  Online:   COLORS.blue,
};

const money = (v) => `Rs. ${Number(v || 0).toLocaleString("en-IN")}`;

const normalizeStatus = (s) => {
  const v = String(s || "Pending").toLowerCase().replaceAll("_", " ").trim();
  if (v === "placed" || v === "pending") return "Pending";
  if (v === "preparing") return "Preparing";
  if (v === "ready" || v === "ready for pickup") return "Ready for Pickup";
  if (v === "out for delivery") return "Out for Delivery";
  if (v === "delivered") return "Delivered";
  if (v === "cancelled" || v === "canceled") return "Cancelled";
  return "Pending";
};

const normalizePaymentMethod = (m) => {
  const v = String(m || "COD").trim();
  if (v.toLowerCase() === "online") return "Razorpay";
  return v || "COD";
};

const getOrderTotal = (o) => Number(o.total || o.price || 0);

const CustomTooltip = ({ active, payload, label, prefix = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(30,30,28,0.95)", border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 10, padding: "10px 14px", backdropFilter: "blur(8px)",
      boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
    }}>
      <p style={{ margin: 0, fontWeight: 800, fontSize: 12, color: "#e5e5e4" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: "4px 0 0", fontSize: 12, color: p.color, fontWeight: 700 }}>
          {p.name}: {prefix}{typeof p.value === "number" ? p.value.toLocaleString("en-IN") : p.value}
        </p>
      ))}
    </div>
  );
};

export default function AdminAnalytics({ orders = [], dashboard = {} }) {
  // ── Revenue chart (last 14 days) ─────────────────────────────────
  const revenueData = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i));
      return d;
    });
    return days.map((d) => {
      const dateStr = d.toDateString();
      const dayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === dateStr);
      const revenue = dayOrders.reduce((s, o) => s + getOrderTotal(o), 0);
      return {
        label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        revenue,
        orders: dayOrders.length,
      };
    });
  }, [orders]);

  // ── Orders by status (pie) ───────────────────────────────────────
  const statusData = useMemo(() => {
    const counts = {};
    orders.forEach((o) => {
      const s = normalizeStatus(o.status);
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [orders]);

  // ── Payment methods (pie) ────────────────────────────────────────
  const paymentData = useMemo(() => {
    const counts = {};
    orders.forEach((o) => {
      const m = normalizePaymentMethod(o.payment_method);
      counts[m] = (counts[m] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [orders]);

  // ── Hourly distribution (bar) ────────────────────────────────────
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, "0")}:00`,
      orders: 0,
    }));
    orders.forEach((o) => {
      const h = new Date(o.created_at).getHours();
      hours[h].orders++;
    });
    // Only return hours with some activity range (6 AM to 11 PM)
    return hours.filter((_, i) => i >= 6 && i <= 23);
  }, [orders]);

  // ── Weekly comparison ────────────────────────────────────────────
  const weeklyData = useMemo(() => {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return dayNames.map((name, i) => {
      const tw = new Date(thisWeekStart); tw.setDate(tw.getDate() + i);
      const lw = new Date(lastWeekStart); lw.setDate(lw.getDate() + i);

      const thisWeekOrders = orders.filter((o) => new Date(o.created_at).toDateString() === tw.toDateString());
      const lastWeekOrders = orders.filter((o) => new Date(o.created_at).toDateString() === lw.toDateString());

      return {
        day: name,
        thisWeek: thisWeekOrders.reduce((s, o) => s + getOrderTotal(o), 0),
        lastWeek: lastWeekOrders.reduce((s, o) => s + getOrderTotal(o), 0),
      };
    });
  }, [orders]);

  return (
    <section className="admin-section">
      <div className="admin-section-head"><h3>Revenue & Order Analytics</h3></div>

      {/* ── Summary cards ──────────────────────────────────── */}
      <div className="admin-metrics-bar" style={{ marginBottom: 24 }}>
        <div className="admin-metric-card"><span>Total Revenue</span><strong>{money(dashboard.totalRevenue)}</strong></div>
        <div className="admin-metric-card"><span>Today Revenue</span><strong>{money(dashboard.todayRevenue)}</strong></div>
        <div className="admin-metric-card"><span>Total Orders</span><strong>{dashboard.totalOrders}</strong></div>
        <div className="admin-metric-card"><span>Delivered</span><strong>{dashboard.deliveredOrders}</strong></div>
        <div className="admin-metric-card"><span>Pending</span><strong>{dashboard.pendingOrders}</strong></div>
        <div className="admin-metric-card"><span>Out for Delivery</span><strong>{dashboard.outForDeliveryOrders}</strong></div>
      </div>

      {/* ── Revenue trend (area chart) ─────────────────────── */}
      <div className="analytics-chart-card">
        <h4>Revenue Trend — Last 14 Days</h4>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.35} />
                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
            <Tooltip content={<CustomTooltip prefix="₹" />} />
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke={COLORS.primary} fill="url(#revGrad)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Pie charts row ─────────────────────────────────── */}
      <div className="analytics-chart-row">
        <div className="analytics-chart-card">
          <h4>Orders by Status</h4>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} strokeWidth={0}>
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || COLORS.muted} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-chart-card">
          <h4>Payment Methods</h4>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} strokeWidth={0}>
                {paymentData.map((entry) => (
                  <Cell key={entry.name} fill={PAYMENT_COLORS[entry.name] || COLORS.blue} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Order time distribution (bar chart) ────────────── */}
      <div className="analytics-chart-card">
        <h4>Orders by Hour of Day</h4>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="orders" name="Orders" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Weekly revenue comparison ──────────────────────── */}
      <div className="analytics-chart-card">
        <h4>Weekly Revenue Comparison</h4>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
            <Tooltip content={<CustomTooltip prefix="₹" />} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
            <Bar dataKey="lastWeek" name="Last Week" fill="rgba(255,255,255,0.12)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="thisWeek" name="This Week" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
