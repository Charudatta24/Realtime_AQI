"use client";

import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://realtime-aqi-1u9g.onrender.com";

function getAqiColor(aqi) {
  if (aqi <= 50) return "#00e400";
  if (aqi <= 100) return "#a3ce32";
  if (aqi <= 200) return "#ffff00";
  if (aqi <= 300) return "#ff7e00";
  if (aqi <= 400) return "#ff0000";
  return "#7e0023";
}

export default function CitySearchBar({ onCitySelect }) {
  const [cities, setCities] = useState([]);
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load the city list (with live AQI already attached) once on mount
  useEffect(() => {
    async function loadCities() {
      try {
        const res = await fetch(`${API_BASE}/api/cities`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        setCities(data.cities);
      } catch (err) {
        console.error("Failed to load city list:", err);
        setError("Could not load city list. Is the backend running on port 8000?");
      }
    }
    loadCities();
  }, []);

  const filtered = cities.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  // When the user clicks a city, fetch its up-to-the-minute AQI explicitly
  // (the /api/cities list is fine for a quick glance, but this guarantees freshness)
  async function handleSelectCity(cityName) {
    setQuery(cityName);
    setShowDropdown(false);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/metrics/city-aqi?city=${encodeURIComponent(cityName)}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setSelected(data);
      if (onCitySelect) onCitySelect(data);
    } catch (err) {
      console.error("Failed to fetch AQI for city:", cityName, err);
      setError(`Could not fetch AQI for ${cityName}.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "relative", maxWidth: "360px" }}>
      <input
        type="text"
        value={query}
        placeholder="Search a city..."
        onChange={(e) => {
          setQuery(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc" }}
      />

      {showDropdown && filtered.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: 6,
            listStyle: "none",
            margin: 0,
            padding: 0,
            zIndex: 10,
            maxHeight: "260px",
            overflowY: "auto",
          }}
        >
          {filtered.map((c) => (
            <li
              key={c.name}
              onClick={() => handleSelectCity(c.name)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
              }}
              onMouseDown={(e) => e.preventDefault()} // keep input focus
            >
              <span>{c.name}</span>
              <span style={{ color: getAqiColor(c.aqi), fontWeight: 600 }}>
                {c.aqi}
              </span>
            </li>
          ))}
        </ul>
      )}

      {loading && <div style={{ marginTop: 8 }}>Fetching AQI...</div>}
      {error && <div style={{ marginTop: 8, color: "#900" }}>{error}</div>}

      {selected && !loading && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
          <strong style={{ color: getAqiColor(selected.aqi), fontSize: "1.5rem" }}>
            AQI: {selected.aqi}
          </strong>
          <div>{selected.city}</div>
          <div>PM2.5: {selected.pm25} µg/m³ &nbsp;|&nbsp; PM10: {selected.pm10} µg/m³</div>
        </div>
      )}
    </div>
  );
}


