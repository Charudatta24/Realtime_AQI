"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

function getAqiColor(aqi) {
  if (aqi <= 50) return "#00e400";
  if (aqi <= 100) return "#a3ce32";
  if (aqi <= 200) return "#ffff00";
  if (aqi <= 300) return "#ff7e00";
  if (aqi <= 400) return "#ff0000";
  return "#7e0023";
}

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function AQIMap() {
  const [marker, setMarker] = useState(null); // { lat, lng, data }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleMapClick(lat, lng) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/metrics/location-aqi?lat=${lat}&lng=${lng}`
      );
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await res.json();
      setMarker({ lat, lng, data });
    } catch (err) {
      console.error("Failed to fetch AQI for clicked location:", err);
      setError("Could not fetch AQI for this location. Is the backend running on port 8000?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "600px" }}>
      <MapContainer
        center={[22.9734, 78.6569]} // Center of India
        zoom={5}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onMapClick={handleMapClick} />

        {marker && (
          <Marker position={[marker.lat, marker.lng]}>
            <Popup>
              <div style={{ minWidth: "160px" }}>
                <strong
                  style={{
                    color: getAqiColor(marker.data.aqi),
                    fontSize: "1.4rem",
                  }}
                >
                  AQI: {marker.data.aqi}
                </strong>
                <div>PM2.5: {marker.data.pm25} µg/m³</div>
                <div>PM10: {marker.data.pm10} µg/m³</div>
                <div>NO2: {marker.data.no2} µg/m³</div>
                <div style={{ fontSize: "0.75rem", color: "#666", marginTop: 4 }}>
                  Source: {marker.data.source}
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {loading && (
        <div style={{ position: "absolute", top: 10, right: 10, background: "#fff", padding: "6px 12px", borderRadius: 6 }}>
          Fetching AQI...
        </div>
      )}
      {error && (
        <div style={{ position: "absolute", top: 10, right: 10, background: "#fee", color: "#900", padding: "6px 12px", borderRadius: 6 }}>
          {error}
        </div>
      )}
    </div>
  );
}
