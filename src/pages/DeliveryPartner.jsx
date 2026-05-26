import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabase/Client";
import { useNotification } from "../context/NotificationContext";
import "./DeliveryPartner.css";

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

const getAddressText = (address) =>
  [
    address.name,
    address.street,
    address.landmark ? `Near ${address.landmark}` : "",
    address.city,
    address.district,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(", ");

export default function DeliveryPartner({ setPage }) {
  const { notify } = useNotification();
  const [orderId, setOrderId] = useState(localStorage.getItem("deliveryPartnerOrderId") || "");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState("");
  const [sharing, setSharing] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const [message, setMessage] = useState("");
  const intervalRef = useRef(null);
  const orderRef = useRef(null);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  const stopSharing = useCallback((nextMessage = "Live location sharing stopped.") => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setSharing(false);
    setMessage(nextMessage);
  }, []);

  useEffect(
    () => () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    },
    []
  );

  const fetchOrder = async () => {
    const cleanOrderId = orderId.trim();

    if (!cleanOrderId) {
      notify("Enter an Order ID", "error");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", cleanOrderId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setOrder(null);
        setMessage("Order not found or access is not allowed.");
        return;
      }

      setOrder(data);
      localStorage.setItem("deliveryPartnerOrderId", String(data.id));
      notify("Order loaded", "success");
    } catch (error) {
      console.error("Delivery partner order fetch error:", error);
      setMessage(error.message || "Unable to fetch order.");
      notify(error.message || "Unable to fetch order", "error");
    } finally {
      setLoading(false);
    }
  };

  const updateOrder = async (payload, actionKey, successMessage) => {
    if (!orderRef.current?.id) {
      notify("Fetch an order first", "error");
      return null;
    }

    setSaving(actionKey);

    try {
      const { data, error } = await supabase
        .from("orders")
        .update(payload)
        .eq("id", orderRef.current.id)
        .select("*")
        .single();

      if (error) throw error;

      setOrder(data);
      setMessage(successMessage);
      notify(successMessage, "success");
      return data;
    } catch (error) {
      console.error("Delivery partner update error:", error);
      setMessage(error.message || "Unable to update order.");
      notify(error.message || "Unable to update order", "error");
      return null;
    } finally {
      setSaving("");
    }
  };

  const startDelivery = () => {
    updateOrder(
      { delivery_status: "Out for Delivery", status: "Out for Delivery" },
      "start",
      "Delivery started."
    );
  };

  const pushCurrentLocation = useCallback(() => {
    if (!orderRef.current?.id) {
      notify("Fetch an order first", "error");
      return;
    }

    if (!navigator.geolocation) {
      setMessage("Location is not supported on this device.");
      notify("Location is not supported on this device", "error");
      stopSharing("Location sharing stopped.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const location = {
          delivery_lat: coords.latitude,
          delivery_lng: coords.longitude,
        };

        setLastLocation({
          lat: coords.latitude,
          lng: coords.longitude,
          updatedAt: new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        });

        try {
          const { data, error } = await supabase
            .from("orders")
            .update(location)
            .eq("id", orderRef.current.id)
            .select("*")
            .single();

          if (error) throw error;

          setOrder(data);
          setMessage("Live location updated.");
        } catch (error) {
          console.error("Live location update error:", error);
          setMessage(error.message || "Unable to update live location.");
          notify(error.message || "Unable to update live location", "error");
        }
      },
      (error) => {
        const denied = error.code === error.PERMISSION_DENIED;
        const nextMessage = denied
          ? "Location permission denied."
          : "Could not read current location.";
        setMessage(nextMessage);
        notify(nextMessage, "error");
        stopSharing("Live location sharing stopped.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }, [notify, stopSharing]);

  const shareLiveLocation = () => {
    if (!order?.id) {
      notify("Fetch an order first", "error");
      return;
    }

    if (sharing) {
      notify("Live location is already sharing", "info");
      return;
    }

    setSharing(true);
    setMessage("Live location sharing started.");
    pushCurrentLocation();
    intervalRef.current = setInterval(pushCurrentLocation, 15000);
  };

  const markDelivered = async () => {
    const updated = await updateOrder(
      { delivery_status: "Delivered", status: "Delivered" },
      "delivered",
      "Order marked delivered."
    );

    if (updated) {
      stopSharing("Order delivered. Live location sharing stopped.");
    }
  };

  const address = safeObject(order?.address);
  const addressText = order ? getAddressText(address) || "Address not available" : "";
  const orderStatus = normalizeStatus(order?.status);
  const deliveryStatus = normalizeStatus(order?.delivery_status || order?.status);

  return (
    <main className="delivery-partner-page">
      <section className="delivery-partner-hero">
        <div>
          <p className="delivery-partner-eyebrow">Delivery Partner</p>
          <h2>Live Delivery Update</h2>
          <p>Fetch an assigned order, share your phone location, and close the delivery from one simple mobile view.</p>
        </div>

        <button type="button" onClick={() => setPage?.("orders")}>
          Back to Orders
        </button>
      </section>

      <section className="delivery-partner-card">
        <div className="delivery-partner-search">
          <label>
            Order ID
            <input
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              placeholder="Example: 123"
            />
          </label>
          <button type="button" onClick={fetchOrder} disabled={loading}>
            {loading ? "Fetching..." : "Fetch Order"}
          </button>
        </div>

        {message && <p className="delivery-partner-message">{message}</p>}

        {order && (
          <>
            <div className="delivery-partner-summary">
              <InfoBlock label="Order ID" value={formatOrderId(order.id)} />
              <InfoBlock label="Order Status" value={orderStatus} />
              <InfoBlock label="Delivery Status" value={deliveryStatus} />
              <InfoBlock label="Customer Phone" value={address.phone || "Not available"} />
            </div>

            <section className="delivery-partner-address">
              <p className="delivery-partner-eyebrow">Customer Address</p>
              <h3>{address.name || "Customer"}</h3>
              <p>{addressText}</p>
            </section>

            {lastLocation && (
              <div className="delivery-location-chip">
                Last shared: {lastLocation.lat.toFixed(6)}, {lastLocation.lng.toFixed(6)} at {lastLocation.updatedAt}
              </div>
            )}

            <div className="delivery-partner-actions">
              <button type="button" onClick={startDelivery} disabled={saving === "start"}>
                {saving === "start" ? "Starting..." : "Start Delivery"}
              </button>
              <button type="button" onClick={shareLiveLocation} disabled={sharing}>
                Share Live Location
              </button>
              <button type="button" onClick={() => stopSharing()} disabled={!sharing}>
                Stop Sharing Location
              </button>
              <button type="button" onClick={markDelivered} disabled={saving === "delivered"}>
                {saving === "delivered" ? "Updating..." : "Mark Delivered"}
              </button>
            </div>
          </>
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
