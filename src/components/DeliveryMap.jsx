import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { KITCHEN_LOCATION } from "../config/location";
import "../styles/delivery-map.css";

const defaultIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

const toCoordinate = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const hasCoordinates = (point) => point.lat != null && point.lng != null;

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

export default function DeliveryMap({ customerLocation, deliveryLocation }) {
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
      label: "Delivery Partner",
      lat: toCoordinate(deliveryLocation?.lat),
      lng: toCoordinate(deliveryLocation?.lng),
    };

    return [kitchen, customer, delivery];
  }, [customerLocation, deliveryLocation]);

  const visiblePoints = points.filter(hasCoordinates);
  const kitchenPoint = points[0];
  const hasCustomerLocation = hasCoordinates(points[1]);

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
          <h3>Kitchen to customer route</h3>
        </div>
        {!hasCustomerLocation && (
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
          {visiblePoints.map((point) => (
            <Marker key={point.type} position={[point.lat, point.lng]}>
              <Popup>
                <strong>{point.label}</strong>
                <br />
                {point.type}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </section>
  );
}
