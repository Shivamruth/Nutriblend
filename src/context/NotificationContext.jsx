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

  // ── Helper: create + subscribe a realtime channel ───────────────────
  const subscribe = useCallback(
    (userId) => {
      // Tear down any previous channel first (handles StrictMode double-mount
      // and re-subscribe on SIGNED_IN).
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
        realtimeRef.current = null;
      }

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
    },
    // notify is stable (useState setter pattern) so no dep needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Subscribe to realtime changes ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid || cancelled) return;

      // Initial load
      await fetchDbNotifications(uid);
      if (cancelled) return;

      // Realtime subscription
      subscribe(uid);
    };

    init();

    // Auth state changes (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION") return; // already handled by init()

      if (event === "SIGNED_IN") {
        const uid = session?.user?.id;
        if (uid && !cancelled) {
          await fetchDbNotifications(uid);
          if (!cancelled) subscribe(uid);
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
      cancelled = true;
      authListener?.subscription?.unsubscribe();
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
        realtimeRef.current = null;
      }
    };
  }, [fetchDbNotifications, subscribe]);

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