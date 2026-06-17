import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { KITCHEN_LOCATION } from "../config/location";
import "../styles/delivery-map.css";

// Default blue marker (kitchen + customer)
const defaultIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Green delivery partner marker (stands out from blue)
const deliveryIcon = new L.DivIcon({
  className: "delivery-partner-marker",
  html: `<div style="
    width: 32px; height: 32px;
    background: linear-gradient(135deg, #22c55e, #16a34a);
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
  ">🛵</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -20],
});

L.Marker.prototype.options.icon = defaultIcon;

const toCoordinate = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const hasCoordinates = (point) => point.lat != null && point.lng != null;

/**
 * Animated delivery partner marker — smoothly transitions to new positions.
 */
function AnimatedMarker({ position, label }) {
  const markerRef = useRef(null);
  const prevPos = useRef(position);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !position) return;

    const current = prevPos.current;
    if (current && (current[0] !== position[0] || current[1] !== position[1])) {
      // Animate over 1 second
      const steps = 30;
      const latStep = (position[0] - current[0]) / steps;
      const lngStep = (position[1] - current[1]) / steps;
      let step = 0;

      const animate = () => {
        step++;
        if (step > steps) return;
        const lat = current[0] + latStep * step;
        const lng = current[1] + lngStep * step;
        marker.setLatLng([lat, lng]);
        requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    }

    prevPos.current = position;
  }, [position]);

  if (!position) return null;

  return (
    <Marker ref={markerRef} position={position} icon={deliveryIcon}>
      <Popup>
        <strong>{label || "Delivery Partner"}</strong>
        <br />
        Live location
      </Popup>
    </Marker>
  );
}

function FitMapBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    const validPoints = points.filter(hasCoordinates);

    if (validPoints.length > 1) {
      map.fitBounds(
        validPoints.map((point) => [point.lat, point.lng]),
        { padding: [36, 36], maxZoom: 15 }
      );
      return;
    }

    if (validPoints.length === 1) {
      map.setView([validPoints[0].lat, validPoints[0].lng], 13);
    }
  }, [map, points]);

  return null;
}

export default function DeliveryMap({ customerLocation, deliveryLocation, partnerName }) {
  const [mapFailed, setMapFailed] = useState(false);

  const points = useMemo(() => {
    const kitchen = {
      type: "Kitchen",
      label: KITCHEN_LOCATION.name || "NutriBlend Kitchen",
      lat: toCoordinate(KITCHEN_LOCATION.lat),
      lng: toCoordinate(KITCHEN_LOCATION.lng),
    };
    const customer = {
      type: "Customer",
      label: "Delivery Address",
      lat: toCoordinate(customerLocation?.lat),
      lng: toCoordinate(customerLocation?.lng),
    };
    const delivery = {
      type: "Delivery Partner",
      label: partnerName || "Delivery Partner",
      lat: toCoordinate(deliveryLocation?.lat),
      lng: toCoordinate(deliveryLocation?.lng),
    };

    return [kitchen, customer, delivery];
  }, [customerLocation, deliveryLocation, partnerName]);

  const kitchenPoint = points[0];
  const customerPoint = points[1];
  const deliveryPoint = points[2];
  const hasCustomerLocation = hasCoordinates(customerPoint);
  const hasDeliveryLocation = hasCoordinates(deliveryPoint);

  // Build route polyline (kitchen → delivery partner → customer)
  const routePositions = useMemo(() => {
    const route = [];
    if (hasCoordinates(kitchenPoint)) route.push([kitchenPoint.lat, kitchenPoint.lng]);
    if (hasDeliveryLocation) route.push([deliveryPoint.lat, deliveryPoint.lng]);
    if (hasCustomerLocation) route.push([customerPoint.lat, customerPoint.lng]);
    return route.length >= 2 ? route : [];
  }, [kitchenPoint, customerPoint, deliveryPoint, hasCustomerLocation, hasDeliveryLocation]);

  if (mapFailed || !hasCoordinates(kitchenPoint)) {
    return (
      <section className="delivery-map-card">
        <div className="delivery-map-fallback">
          <p>Map tracking is temporarily unavailable.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="delivery-map-card">
      <div className="delivery-map-head">
        <div>
          <p>Delivery Map</p>
          <h3>
            {hasDeliveryLocation
              ? "Live tracking active"
              : "Kitchen to customer route"}
          </h3>
        </div>
        {hasDeliveryLocation && (
          <span className="delivery-map-live-badge">● LIVE</span>
        )}
        {!hasCustomerLocation && !hasDeliveryLocation && (
          <span>Map tracking is limited because location was not added.</span>
        )}
      </div>

      <div className="delivery-map-frame">
        <MapContainer
          center={[kitchenPoint.lat, kitchenPoint.lng]}
          zoom={13}
          scrollWheelZoom={false}
          className="delivery-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            eventHandlers={{
              tileerror: () => setMapFailed(true),
            }}
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitMapBounds points={points} />

          {/* Route line */}
          {routePositions.length >= 2 && (
            <Polyline
              positions={routePositions}
              pathOptions={{
                color: "#06b6d4",
                weight: 3,
                opacity: 0.7,
                dashArray: "8, 12",
              }}
            />
          )}

          {/* Kitchen marker */}
          {hasCoordinates(kitchenPoint) && (
            <Marker position={[kitchenPoint.lat, kitchenPoint.lng]}>
              <Popup>
                <strong>{kitchenPoint.label}</strong>
                <br />
                Kitchen
              </Popup>
            </Marker>
          )}

          {/* Customer marker */}
          {hasCustomerLocation && (
            <Marker position={[customerPoint.lat, customerPoint.lng]}>
              <Popup>
                <strong>{customerPoint.label}</strong>
                <br />
                Customer
              </Popup>
            </Marker>
          )}

          {/* Animated delivery partner marker */}
          {hasDeliveryLocation && (
            <AnimatedMarker
              position={[deliveryPoint.lat, deliveryPoint.lng]}
              label={deliveryPoint.label}
            />
          )}
        </MapContainer>
      </div>
    </section>
  );
}
