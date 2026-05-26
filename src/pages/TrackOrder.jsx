import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";
import DeliveryMap from "../components/DeliveryMap";
import "../styles/track-order.css";

const TRACK_STEPS = [
  "Pending",
  "Preparing",
  "Ready for Pickup",
  "Out for Delivery",
  "Delivered",
];

const money = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

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

const normalizePaymentMethod = (method) => {
  const value = String(method || "COD").trim();
  if (!value) return "COD";
  if (value.toLowerCase() === "online") return "Razorpay";
  return value;
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

const getAddressText = (address) =>
  [
    address.name,
    address.phone,
    address.street,
    address.landmark ? `Near ${address.landmark}` : "",
    address.city,
    address.district,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(", ");

const toCoordinate = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getEstimatedDelivery = (order) => {
  if (order.estimated_delivery_time) return order.estimated_delivery_time;
  if (order.delivery_eta) return order.delivery_eta;
  if (order.eta) return order.eta;
  if (order.delivery_option) return `${order.delivery_option}: Today / Tomorrow`;
  if (!order.created_at) return "Today / Tomorrow";

  const estimate = new Date(order.created_at);
  estimate.setMinutes(estimate.getMinutes() + 45);
  return formatDateTime(estimate);
};

const getDeliveryPartner = (order) => {
  const partner = safeObject(order.delivery_partner);

  return {
    name:
      order.delivery_partner_name ||
      order.partner_name ||
      partner.name ||
      "Not assigned yet",
    phone:
      order.delivery_partner_phone ||
      order.partner_phone ||
      partner.phone ||
      "Not assigned yet",
  };
};

export default function TrackOrder({ orderId, setPage }) {
  const { notify } = useNotification();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState("Connecting live updates...");

  const resolvedOrderId = orderId || localStorage.getItem("trackOrderId") || "";

  const fetchOrder = useCallback(async ({ silent = false } = {}) => {
    if (!resolvedOrderId) {
      setErrorMessage("Order ID is missing.");
      setLoading(false);
      return;
    }

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage("Please login again to track this order.");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", resolvedOrderId)
        .maybeSingle();

      if (error) throw error;

      const isAdmin = profile?.role === "admin";

      if (!data || (!isAdmin && String(data.user_id) !== String(user.id))) {
        setErrorMessage("Order not found or you do not have access to this order.");
        setOrder(null);
        return;
      }

      setOrder(data);
      localStorage.setItem("trackOrderId", String(data.id));
    } catch (error) {
      console.error("Track order fetch error:", error);
      setErrorMessage(error.message || "Unable to fetch order tracking details.");
      notify(error.message || "Unable to fetch order tracking details", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [notify, resolvedOrderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  useEffect(() => {
    if (!resolvedOrderId) return undefined;

    const channel = supabase
      .channel(`track-order-${resolvedOrderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${resolvedOrderId}`,
        },
        (payload) => {
          if (!payload.new) return;

          setOrder((prev) => {
            if (prev && String(prev.id) !== String(payload.new.id)) return prev;
            return { ...(prev || {}), ...payload.new };
          });
          setRealtimeStatus("Live updates active");
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("Live updates active");
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeStatus("Live updates delayed. Use Refresh if needed.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resolvedOrderId]);

  const details = useMemo(() => {
    if (!order) return null;

    const address = safeObject(order.address);
    const status = normalizeStatus(order.status);
    const deliveryStatus = normalizeStatus(order.delivery_status || order.status);
    const partner = getDeliveryPartner(order);
    const currentStep =
      deliveryStatus === "Cancelled"
        ? -1
        : Math.max(0, TRACK_STEPS.indexOf(deliveryStatus));

    return {
      address,
      addressText: getAddressText(address) || "Delivery address not available",
      currentStep,
      customerLocation: {
        lat: toCoordinate(order.customer_lat ?? address.customer_lat ?? address.lat),
        lng: toCoordinate(order.customer_lng ?? address.customer_lng ?? address.lng),
      },
      deliveryLocation: {
        lat: toCoordinate(order.delivery_lat),
        lng: toCoordinate(order.delivery_lng),
      },
      partner,
      paymentMethod: normalizePaymentMethod(order.payment_method),
      deliveryStatus,
      status,
      total: money(order.total || order.price),
      eta: getEstimatedDelivery(order),
    };
  }, [order]);

  const contactSupport = () => {
    const message = encodeURIComponent(
      `Hi NutriBlend, I need help tracking order ${formatOrderId(resolvedOrderId)}.`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <main className="track-order-page">
        <section className="track-order-shell">
          <div className="track-skeleton wide" />
          <div className="track-skeleton" />
          <div className="track-skeleton short" />
        </section>
      </main>
    );
  }

  if (errorMessage || !order || !details) {
    return (
      <main className="track-order-page">
        <section className="track-order-state">
          <p className="track-eyebrow">Track Order</p>
          <h2>Unable to load tracking</h2>
          <p>{errorMessage || "Order tracking details are unavailable."}</p>
          <div className="track-state-actions">
            <button type="button" onClick={() => fetchOrder({ silent: true })} disabled={refreshing}>
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button type="button" onClick={() => setPage?.("orders")}>
              Back to Orders
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="track-order-page">
      <section className="track-order-hero">
        <div>
          <p className="track-eyebrow">Live Order Tracking</p>
          <h2>{formatOrderId(order.id)}</h2>
          <p>
            Current status: <strong>{details.status}</strong>
          </p>
          <span className="track-live-status">{realtimeStatus}</span>
        </div>

        <div className="track-status-card">
          <span>Estimated Delivery</span>
          <strong>{details.eta}</strong>
          <button type="button" onClick={() => fetchOrder({ silent: true })} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      <section className="track-order-shell">
        <div className="track-timeline" aria-label="Delivery timeline">
          {TRACK_STEPS.map((step, index) => (
            <div
              className={`track-step ${index <= details.currentStep ? "active" : ""}`}
              key={step}
            >
              <span>{index + 1}</span>
              <div>
                <strong>{step}</strong>
                <p>{index <= details.currentStep ? "Completed" : "Pending update"}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="track-details-grid">
          <InfoPanel label="Delivery Partner" value={details.partner.name} />
          <InfoPanel label="Partner Phone" value={details.partner.phone} />
          <InfoPanel label="Delivery Status" value={details.deliveryStatus} />
          <InfoPanel label="Payment Method" value={details.paymentMethod} />
          <InfoPanel label="Total Amount" value={details.total} highlight />
        </div>

        <section className="track-address-panel">
          <p className="track-eyebrow">Delivery Address</p>
          <h3>{details.address.name || "Customer"}</h3>
          <p>{details.addressText}</p>
        </section>

        <DeliveryMap
          customerLocation={details.customerLocation}
          deliveryLocation={details.deliveryLocation}
        />

        <div className="track-actions">
          <button type="button" className="track-support-btn" onClick={contactSupport}>
            Contact Support
          </button>
          <button type="button" className="track-back-btn" onClick={() => setPage?.("orders")}>
            Back to Orders
          </button>
        </div>
      </section>
    </main>
  );
}

function InfoPanel({ label, value, highlight = false }) {
  return (
    <div className="track-info-panel">
      <span>{label}</span>
      <strong className={highlight ? "highlight" : ""}>{value}</strong>
    </div>
  );
}
