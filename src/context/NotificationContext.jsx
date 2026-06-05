import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../supabase/Client";

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export default function NotificationProvider({ children }) {
  // ── Toast notifications (in-memory, ephemeral) ───────────────────────
  const [notifications, setNotifications] = useState([]);

  // ── Persistent DB notifications (from Supabase) ──────────────────────
  const [dbNotifications, setDbNotifications] = useState([]);
  const realtimeRef = useRef(null);

  const notify = (message, type = "success") => {
    const newNotification = {
      id: Date.now(),
      message,
      type,
      read: false,
      time: new Date().toLocaleTimeString(),
    };
    setNotifications((prev) => [newNotification, ...prev]);
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // ── DB notification helpers ───────────────────────────────────────────
  const fetchDbNotifications = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setDbNotifications(data);
    }
  }, []);

  const markDbAllRead = useCallback(async (userId) => {
    if (!userId) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    setDbNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, []);

  const markDbAsRead = useCallback(async (notificationId) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    setDbNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
  }, []);

  // ── Subscribe to realtime changes ─────────────────────────────────────
  useEffect(() => {
    let userId = null;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      userId = data?.user?.id;
      if (!userId) return;

      // Initial load
      await fetchDbNotifications(userId);

      // Realtime subscription
      const channel = supabase
        .channel(`notifications:user:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const newNotification = payload.new;
            setDbNotifications((prev) => [newNotification, ...prev]);
            // Also show a toast for important notification types
            const importantTypes = ["order_placed", "out_for_delivery", "delivered", "payment_success"];
            if (importantTypes.includes(newNotification.notification_type)) {
              notify(newNotification.title, "success");
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            setDbNotifications((prev) =>
              prev.map((n) => (n.id === payload.new.id ? { ...n, ...payload.new } : n))
            );
          }
        )
        .subscribe();

      realtimeRef.current = channel;
    };

    init();

    // Auth state changes (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN") {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.id) {
          await fetchDbNotifications(data.user.id);
        }
      } else if (event === "SIGNED_OUT") {
        setDbNotifications([]);
        if (realtimeRef.current) {
          supabase.removeChannel(realtimeRef.current);
          realtimeRef.current = null;
        }
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
        realtimeRef.current = null;
      }
    };
  }, [fetchDbNotifications]);

  const unreadCount = dbNotifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{
        // Toast system (unchanged API)
        notifications,
        notify,
        markAllRead,
        clearNotifications,
        // DB persistent notifications
        dbNotifications,
        unreadCount,
        markDbAllRead,
        markDbAsRead,
        fetchDbNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}