import { useEffect, useState } from "react";
import { useNotification } from "../context/NotificationContext";
import { supabase } from "../supabase/Client";
import "../styles/notifications.css";

const TYPE_ICONS = {
  order_placed:    "🛒",
  order_preparing: "👨‍🍳",
  order_ready:     "📦",
  out_for_delivery:"🚴",
  delivered:       "✅",
  payment_success: "💳",
  order_cancelled: "❌",
  subscription_activated: "🔄",
  general:         "🔔",
};

const TYPE_COLORS = {
  order_placed:    "#3b82f6",
  order_preparing: "#f59e0b",
  order_ready:     "#8b5cf6",
  out_for_delivery:"#06b6d4",
  delivered:       "#22c55e",
  payment_success: "#10b981",
  order_cancelled: "#ef4444",
  subscription_activated: "#84cc16",
  general:         "#64748b",
};

const formatTime = (ts) => {
  if (!ts) return "";
  const date = new Date(ts);
  const now  = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr  = Math.floor(diffMs / 3600000);

  if (diffMin < 1)  return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr  < 24) return `${diffHr}h ago`;

  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export default function NotificationCenter({ setPage }) {
  const { dbNotifications, markDbAllRead, markDbAsRead, unreadCount } = useNotification();
  const [userId, setUserId] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data?.user?.id;
      if (uid) setUserId(uid);
    });
  }, []);

  const handleMarkAllRead = () => {
    if (userId) markDbAllRead(userId);
  };

  const filteredNotifications =
    filter === "unread"
      ? dbNotifications.filter((n) => !n.is_read)
      : dbNotifications;

  const groupedByDate = filteredNotifications.reduce((acc, n) => {
    const date = new Date(n.created_at).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(n);
    return acc;
  }, {});

  return (
    <div className="notification-center-page">
      <div className="notification-center-shell">
        <header className="notification-center-header">
          <div>
            <p className="notification-center-eyebrow">Updates</p>
            <h2 className="notification-center-title">
              Notifications
              {unreadCount > 0 && (
                <span className="notification-badge" style={{ position: "relative", top: -2, left: 10 }}>
                  {unreadCount}
                </span>
              )}
            </h2>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-center-mark-btn"
                onClick={handleMarkAllRead}
              >
                Mark all read
              </button>
            )}
            {setPage && (
              <button
                type="button"
                className="notification-center-back-btn"
                onClick={() => setPage("home")}
              >
                ← Back
              </button>
            )}
          </div>
        </header>

        {/* Filter tabs */}
        <div className="notification-center-filters">
          {["all", "unread"].map((f) => (
            <button
              key={f}
              type="button"
              className={`notification-center-filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? `All (${dbNotifications.length})` : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>

        {/* Notification list */}
        {filteredNotifications.length === 0 ? (
          <div className="notification-center-empty">
            <p style={{ fontSize: 48 }}>🔔</p>
            <p style={{ marginTop: 12, fontWeight: 600 }}>
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
            <p style={{ color: "var(--text-muted, #94a3b8)", marginTop: 8 }}>
              Order updates, payment confirmations, and delivery alerts will appear here.
            </p>
          </div>
        ) : (
          <div className="notification-center-list">
            {Object.entries(groupedByDate).map(([date, items]) => (
              <div key={date}>
                <p className="notification-center-date-label">
                  {new Date(date).toDateString() === new Date().toDateString()
                    ? "Today"
                    : new Date(date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
                </p>

                {items.map((n) => {
                  const icon  = TYPE_ICONS[n.notification_type] || "🔔";
                  const color = TYPE_COLORS[n.notification_type] || "#64748b";

                  return (
                    <article
                      key={n.id}
                      className={`notification-center-item ${n.is_read ? "" : "notification-center-item-unread"}`}
                      onClick={() => !n.is_read && markDbAsRead(n.id)}
                      style={{ cursor: n.is_read ? "default" : "pointer" }}
                    >
                      <div
                        className="notification-center-icon"
                        style={{ background: `${color}22`, color }}
                      >
                        {icon}
                      </div>

                      <div className="notification-center-content">
                        <p className="notification-center-item-title">
                          {n.title}
                          {!n.is_read && <span className="notification-center-unread-dot" />}
                        </p>
                        <p className="notification-center-item-message">{n.message}</p>
                        <div className="notification-center-item-meta">
                          <span>{formatTime(n.created_at)}</span>
                          {n.order_id && (
                            <button
                              type="button"
                              className="notification-center-order-link"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPage?.("orders");
                              }}
                            >
                              View Order →
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
