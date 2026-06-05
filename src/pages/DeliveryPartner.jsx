import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";
import "../styles/delivery-partner.css";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const formatOrderId = (id) => {
  if (!id) return "NB-000000";
  const value = String(id);
  if (/^\d+$/.test(value)) return `NB-${value.padStart(6, "0")}`;
  return `NB-${value.slice(-8).toUpperCase()}`;
};

const safeObject = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (!value || typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const normalizeStatus = (status) => {
  const value = String(status || "Pending").toLowerCase().replaceAll("_", " ").trim();
  if (value === "placed" || value === "pending") return "Pending";
  if (value === "preparing") return "Preparing";
  if (value === "ready" || value === "ready for pickup") return "Ready for Pickup";
  if (value === "out for delivery") return "Out for Delivery";
  if (value === "delivered") return "Delivered";
  if (value === "cancelled" || value === "canceled") return "Cancelled";
  return "Pending";
};

const getAddressText = (address) =>
  [address.name, address.street, address.landmark ? `Near ${address.landmark}` : "", address.city, address.district, address.state, address.pincode]
    .filter(Boolean)
    .join(", ");

const buildGoogleMapsLink = (address, lat, lng) => {
  if (lat && lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  const query = encodeURIComponent(getAddressText(address));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
};

export default function DeliveryPartner({ setPage }) {
  const { notify } = useNotification();
  const [user, setUser]             = useState(null);
  const [isPartner, setIsPartner]   = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  // Assigned orders list
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Active single-order view
  const [activeOrder, setActiveOrder] = useState(null);
  const [saving, setSaving]           = useState("");
  const [sharing, setSharing]         = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const [message, setMessage]         = useState("");
  const intervalRef = useRef(null);
  const activeOrderRef = useRef(null);

  useEffect(() => { activeOrderRef.current = activeOrder; }, [activeOrder]);

  // ── Auth check ──────────────────────────────────────────────────────
  useEffect(() => {
    const checkRole = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) { setCheckingRole(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", uid)
        .maybeSingle();

      const role = profile?.role;
      setUser({ ...data.user, full_name: profile?.full_name });
      setIsPartner(role === "delivery_partner" || role === "admin");
      setCheckingRole(false);
    };

    checkRole();
  }, []);

  // ── Load assigned orders ────────────────────────────────────────────
  const loadAssignments = useCallback(async () => {
    if (!user) return;
    setLoadingAssignments(true);
    try {
      const session = await supabase.auth.getSession();
      const token   = session.data?.session?.access_token;

      const res = await fetch(`${API_BASE}/delivery/my-assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setAssignments(json.data || []);
      } else {
        // Fallback: query Supabase directly (RLS allows it)
        const { data } = await supabase
          .from("orders")
          .select("*")
          .eq("delivery_partner_id", user.id)
          .not("status", "in", '("Delivered","Cancelled")')
          .order("created_at", { ascending: false });

        setAssignments(data || []);
      }
    } catch (err) {
      console.error("Assignments fetch error:", err);
    } finally {
      setLoadingAssignments(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && isPartner) loadAssignments();
  }, [user, isPartner, loadAssignments]);

  // ── Cleanup on unmount ──────────────────────────────────────────────
  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const stopSharing = useCallback((msg = "Live location sharing stopped.") => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setSharing(false);
    setMessage(msg);
  }, []);

  // ── Push location to delivery_tracking table ────────────────────────
  const pushCurrentLocation = useCallback(() => {
    const order = activeOrderRef.current;
    if (!order?.id) { notify("Select an order first", "error"); return; }

    if (!navigator.geolocation) {
      const msg = "Location is not supported on this device.";
      setMessage(msg);
      notify(msg, "error");
      stopSharing("Location sharing stopped.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = coords.latitude;
        const lng = coords.longitude;

        setLastLocation({
          lat, lng,
          updatedAt: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        });

        try {
          const session = await supabase.auth.getSession();
          const token   = session.data?.session?.access_token;

          const res = await fetch(`${API_BASE}/delivery/tracking`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ orderId: order.id, latitude: lat, longitude: lng, status: "Out for Delivery" }),
          });

          if (!res.ok) {
            // Fallback: direct Supabase insert
            await supabase.from("delivery_tracking").insert([{
              order_id: order.id,
              delivery_partner_id: user?.id,
              latitude: lat,
              longitude: lng,
              status: "Out for Delivery",
            }]);
          }

          setMessage("Live location updated ✓");
        } catch (err) {
          console.error("Location update error:", err);
          setMessage("Unable to update location.");
          notify("Unable to update live location", "error");
        }
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
        const msg = denied ? "Location permission denied." : "Could not read current location.";
        setMessage(msg);
        notify(msg, "error");
        stopSharing("Live location sharing stopped.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }, [notify, stopSharing, user]);

  const shareLiveLocation = () => {
    if (!activeOrderRef.current?.id) { notify("Select an order first", "error"); return; }
    if (sharing) { notify("Already sharing", "info"); return; }
    setSharing(true);
    setMessage("Live location sharing started.");
    pushCurrentLocation();
    intervalRef.current = setInterval(pushCurrentLocation, 15000);
  };

  // ── Update order status ─────────────────────────────────────────────
  const updateOrderStatus = async (orderId, status, actionKey, successMsg) => {
    setSaving(actionKey);
    try {
      const session = await supabase.auth.getSession();
      const token   = session.data?.session?.access_token;

      const res = await fetch(`${API_BASE}/delivery/assignments/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        const json = await res.json();
        setActiveOrder(json.data);
        setAssignments((prev) => prev.map((o) => (o.id === orderId ? json.data : o)));
      } else {
        // Fallback: direct Supabase update
        const { data } = await supabase
          .from("orders")
          .update({ status, delivery_status: status })
          .eq("id", orderId)
          .select("*")
          .single();
        setActiveOrder(data);
        setAssignments((prev) => prev.map((o) => (o.id === orderId ? data : o)));
      }

      setMessage(successMsg);
      notify(successMsg, "success");

      if (status === "Delivered") {
        stopSharing("Order delivered. Location sharing stopped.");
        setTimeout(() => {
          setActiveOrder(null);
          loadAssignments();
        }, 2000);
      }
    } catch (err) {
      console.error("Status update error:", err);
      notify(err.message || "Could not update order", "error");
    } finally {
      setSaving("");
    }
  };

  // ── Access guard ────────────────────────────────────────────────────
  if (checkingRole) {
    return (
      <main className="delivery-partner-page">
        <div style={{ textAlign: "center", padding: 60 }}>
          <p>Checking access…</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="delivery-partner-page">
        <section className="delivery-partner-hero">
          <h2>Please log in to access the delivery dashboard</h2>
          <button type="button" onClick={() => setPage?.("home")}>Go Home</button>
        </section>
      </main>
    );
  }

  if (!isPartner) {
    return (
      <main className="delivery-partner-page">
        <section className="delivery-partner-hero">
          <p className="delivery-partner-eyebrow">Access Denied</p>
          <h2>Delivery Partner Area</h2>
          <p>This page is only accessible to delivery partners. Please contact the admin if you believe this is a mistake.</p>
          <button type="button" onClick={() => setPage?.("home")}>Go Home</button>
        </section>
      </main>
    );
  }

  // ── Active order detail view ────────────────────────────────────────
  if (activeOrder) {
    const address      = safeObject(activeOrder.address);
    const addressText  = getAddressText(address) || "Address not available";
    const orderStatus  = normalizeStatus(activeOrder.status);
    const deliveryStatus = normalizeStatus(activeOrder.delivery_status || activeOrder.status);
    const mapsLink     = buildGoogleMapsLink(address, address.lat, address.lng);

    return (
      <main className="delivery-partner-page">
        <section className="delivery-partner-hero">
          <div>
            <p className="delivery-partner-eyebrow">Active Delivery</p>
            <h2>{formatOrderId(activeOrder.id)}</h2>
            <p>Use the controls below to manage this delivery.</p>
          </div>
          <button type="button" onClick={() => { stopSharing(); setActiveOrder(null); }}>
            ← Back to Assignments
          </button>
        </section>

        <section className="delivery-partner-card">
          <div className="delivery-partner-summary">
            <InfoBlock label="Order ID" value={formatOrderId(activeOrder.id)} />
            <InfoBlock label="Order Status" value={orderStatus} />
            <InfoBlock label="Delivery Status" value={deliveryStatus} />
            <InfoBlock label="Customer Phone" value={address.phone || "Not available"} />
          </div>

          <section className="delivery-partner-address">
            <p className="delivery-partner-eyebrow">Customer Address</p>
            <h3>{address.name || "Customer"}</h3>
            <p>{addressText}</p>
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              id="navigate-maps-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 12,
                padding: "8px 18px",
                background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                color: "white",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              🗺️ Navigate via Google Maps
            </a>
          </section>

          {lastLocation && (
            <div className="delivery-location-chip">
              📍 Last shared: {lastLocation.lat.toFixed(6)}, {lastLocation.lng.toFixed(6)} at {lastLocation.updatedAt}
            </div>
          )}

          {message && <p className="delivery-partner-message">{message}</p>}

          <div className="delivery-partner-actions">
            <button
              type="button"
              id="start-delivery-btn"
              onClick={() => updateOrderStatus(activeOrder.id, "Out for Delivery", "start", "Delivery started!")}
              disabled={saving === "start" || deliveryStatus === "Out for Delivery"}
            >
              {saving === "start" ? "Starting…" : "Start Delivery"}
            </button>
            <button
              type="button"
              id="share-location-btn"
              onClick={shareLiveLocation}
              disabled={sharing}
            >
              {sharing ? "Sharing Location…" : "Share Live Location"}
            </button>
            <button
              type="button"
              onClick={() => stopSharing()}
              disabled={!sharing}
            >
              Stop Sharing
            </button>
            <button
              type="button"
              id="mark-delivered-btn"
              onClick={() => updateOrderStatus(activeOrder.id, "Delivered", "delivered", "Order marked as delivered!")}
              disabled={saving === "delivered"}
              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "white" }}
            >
              {saving === "delivered" ? "Updating…" : "✓ Mark Delivered"}
            </button>
          </div>
        </section>
      </main>
    );
  }

  // ── Assignments list view ───────────────────────────────────────────
  return (
    <main className="delivery-partner-page">
      <section className="delivery-partner-hero">
        <div>
          <p className="delivery-partner-eyebrow">Delivery Partner</p>
          <h2>My Assignments</h2>
          <p>Hello{user.full_name ? `, ${user.full_name}` : ""}! Select an order below to start delivery.</p>
        </div>
        <button type="button" onClick={() => setPage?.("home")}>← Home</button>
      </section>

      <section className="delivery-partner-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>
            Active Orders ({assignments.length})
          </h3>
          <button type="button" onClick={loadAssignments} disabled={loadingAssignments} style={{ fontSize: 13, padding: "6px 14px" }}>
            {loadingAssignments ? "Loading…" : "⟳ Refresh"}
          </button>
        </div>

        {loadingAssignments ? (
          <p style={{ color: "var(--text-muted, #94a3b8)", textAlign: "center", padding: 32 }}>Loading assignments…</p>
        ) : assignments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ fontSize: 40 }}>📦</p>
            <p style={{ fontWeight: 600, marginTop: 12 }}>No active assignments</p>
            <p style={{ color: "var(--text-muted, #94a3b8)", marginTop: 8, fontSize: 14 }}>
              Orders assigned to you by admin will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {assignments.map((order) => {
              const addr   = safeObject(order.address);
              const status = normalizeStatus(order.status);

              return (
                <div
                  key={order.id}
                  style={{
                    padding: "16px 18px",
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.08)",
                    cursor: "pointer",
                  }}
                  onClick={() => { setActiveOrder(order); setMessage(""); setLastLocation(null); }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ fontWeight: 700 }}>{formatOrderId(order.id)}</p>
                    <span style={{
                      padding: "3px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      background: status === "Out for Delivery" ? "rgba(6,182,212,0.15)" : "rgba(132,204,22,0.12)",
                      color: status === "Out for Delivery" ? "#06b6d4" : "#84cc16",
                    }}>
                      {status}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-muted, #94a3b8)", marginTop: 4 }}>
                    {addr.name || "Customer"} — {addr.city || "Unknown city"}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-muted, #64748b)", marginTop: 4 }}>
                    {new Date(order.created_at).toLocaleString("en-IN")} · Tap to open →
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="delivery-info-block">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
