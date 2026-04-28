import { useState } from "react";
import { useNotification } from "../context/NotificationContext";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);

  const {
    notifications,
    markAllRead,
    clearNotifications,
  } = useNotification();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const toggleBell = () => {
    setOpen(!open);
    markAllRead();
  };

  return (
    <div className="notification-wrapper">
      <button className="notification-bell" onClick={toggleBell}>
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h4>Notifications</h4>

            {notifications.length > 0 && (
              <button onClick={clearNotifications}>Clear</button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="notification-empty">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={`notification-item ${n.type}`}>
                <p>{n.message}</p>
                <span>{n.time}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}