'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Rectangle, CircleMarker, Popup, useMap, Marker } from 'react-leaflet';
import L from 'leaflet';
import { getAqiColor, getAqiLabel } from '../utils/aqi';

// ── Constants ─────────────────────────────────────────────────────────────────
const CITY_CENTERS = {
  Delhi:     [28.6139, 77.2090],
  Mumbai:    [19.0760, 72.8777],
  Bengaluru: [12.9716, 77.5946],
  Chennai:   [13.0827, 80.2707],
  Kolkata:   [22.5726, 88.3639],
};
const GRID_ROWS = 10;
const GRID_COLS = 10;
const GRID_SPAN_DEG = 0.5; // degrees each side from center

// ── Map auto-center helper ────────────────────────────────────────────────────
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, zoom); }, [center, zoom, map]);
  return null;
}

// ── Click-handler shim (pass raw map clicks up) ───────────────────────────────
function MapClickHandler({ onRawClick }) {
  const map = useMap();
  useEffect(() => {
    const h = (e) => { if (onRawClick) onRawClick(e.latlng.lat, e.latlng.lng); };
    map.on('click', h);
    return () => map.off('click', h);
  }, [map, onRawClick]);
  return null;
}

// ── AQI Grid Overlay ──────────────────────────────────────────────────────────
function AqiGridOverlay({ gridAqi, cityCenter, onCellClick, selectedCell }) {
  if (!gridAqi || !cityCenter) return null;

  const [lat0, lon0] = cityCenter;
  const cellH = (GRID_SPAN_DEG * 2) / GRID_ROWS;
  const cellW = (GRID_SPAN_DEG * 2) / GRID_COLS;

  return (
    <>
      {gridAqi.map((row, ri) =>
        row.map((aqi, ci) => {
          const minLat = lat0 - GRID_SPAN_DEG + ri * cellH;
          const maxLat = minLat + cellH;
          const minLon = lon0 - GRID_SPAN_DEG + ci * cellW;
          const maxLon = minLon + cellW;
          const hex = getAqiColor(aqi);
          const isSelected = selectedCell?.row === ri && selectedCell?.col === ci;

          return (
            <Rectangle
              key={`${ri}-${ci}`}
              bounds={[[minLat, minLon], [maxLat, maxLon]]}
              pathOptions={{
                fillColor: hex,
                fillOpacity: isSelected ? 0.8 : 0.38,
                color: isSelected ? '#fff' : hex,
                weight: isSelected ? 2 : 0.3,
              }}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  onCellClick({ row: ri, col: ci, aqi });
                },
              }}
            >
              <Popup>
                <div className="font-sans text-sm min-w-[140px]">
                  <p className="font-bold text-zinc-800">Cell ({ri}, {ci})</p>
                  <p style={{ color: hex }} className="font-bold text-lg">{aqi}</p>
                  <p className="text-xs text-zinc-500">{getAqiLabel(aqi)}</p>
                  <p className="text-[10px] text-zinc-400 mt-1 border-t pt-1">Click to analyse →</p>
                </div>
              </Popup>
            </Rectangle>
          );
        })
      )}
    </>
  );
}

// ── CAAQMS Station Markers ────────────────────────────────────────────────────
function StationOverlay({ stations, cityCenter, showStations }) {
  if (!showStations || !stations || !cityCenter) return null;

  const [lat0, lon0] = cityCenter;
  const cellH = (GRID_SPAN_DEG * 2) / GRID_ROWS;
  const cellW = (GRID_SPAN_DEG * 2) / GRID_COLS;

  return (
    <>
      {stations.map((st, i) => {
        const lat = lat0 - GRID_SPAN_DEG + (st.row + 0.5) * cellH;
        const lon = lon0 - GRID_SPAN_DEG + (st.col + 0.5) * cellW;
        const color = getAqiColor(st.aqi);
        return (
          <CircleMarker key={i} center={[lat, lon]} radius={6}
            pathOptions={{ fillColor: color, fillOpacity: 1, color: '#fff', weight: 1.5 }}>
            <Popup>
              <div className="font-sans text-xs min-w-[140px]">
                <p className="font-bold">{st.name}</p>
                <p style={{ color }} className="font-bold text-base">{st.aqi}</p>
                <p className="text-zinc-500">PM2.5: {st.pm25} µg/m³</p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

// ── Satellite Fire Markers ────────────────────────────────────────────────────
function FireOverlay({ fires, cityCenter, showFires }) {
  if (!showFires || !fires || !cityCenter) return null;

  const [lat0, lon0] = cityCenter;
  const cellH = (GRID_SPAN_DEG * 2) / GRID_ROWS;
  const cellW = (GRID_SPAN_DEG * 2) / GRID_COLS;

  return (
    <>
      {fires.map((f, i) => {
        const lat = lat0 - GRID_SPAN_DEG + (f.row + 0.5) * cellH;
        const lon = lon0 - GRID_SPAN_DEG + (f.col + 0.5) * cellW;
        return (
          <CircleMarker key={i} center={[lat, lon]} radius={7}
            pathOptions={{ fillColor: '#ef4444', fillOpacity: 0.9, color: '#fca5a5', weight: 2 }}>
            <Popup>
              <div className="font-sans text-xs">
                <p className="font-bold text-red-600">🔥 Satellite Fire</p>
                <p>FRP: {f.frp?.toFixed(1)} MW</p>
                <p className="text-zinc-500">Cell ({f.row},{f.col})</p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

// ── Construction Site Markers ─────────────────────────────────────────────────
function ConstructionOverlay({ sites, cityCenter, showConstruction }) {
  if (!showConstruction || !sites || !cityCenter) return null;

  const [lat0, lon0] = cityCenter;
  const cellH = (GRID_SPAN_DEG * 2) / GRID_ROWS;
  const cellW = (GRID_SPAN_DEG * 2) / GRID_COLS;

  return (
    <>
      {sites.map((s, i) => {
        const lat = lat0 - GRID_SPAN_DEG + (s.row + 0.5) * cellH;
        const lon = lon0 - GRID_SPAN_DEG + (s.col + 0.5) * cellW;
        return (
          <CircleMarker key={i} center={[lat, lon]} radius={5}
            pathOptions={{ fillColor: '#f97316', fillOpacity: 0.85, color: '#fdba74', weight: 1.5, dashArray: '3,2' }}>
            <Popup>
              <div className="font-sans text-xs">
                <p className="font-bold text-orange-600">🏗️ Construction Site</p>
                <p>Dust Intensity: {s.strength?.toFixed(1)}</p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

// ── Active Dispatch Markers ───────────────────────────────────────────────────
function DispatchOverlay({ dispatches, cityCenter, showDispatches }) {
  if (!showDispatches || !dispatches || !cityCenter) return null;
  const entries = Object.entries(dispatches);
  if (!entries.length) return null;

  const [lat0, lon0] = cityCenter;

  return (
    <>
      {entries.map(([id, d], i) => {
        // Place dispatch marker near center with small offset per dispatch
        const lat = lat0 + (i - entries.length / 2) * 0.02;
        const lon = lon0 + (i - entries.length / 2) * 0.02;
        return (
          <CircleMarker key={id} center={[lat, lon]} radius={9}
            pathOptions={{ fillColor: '#a78bfa', fillOpacity: 0.9, color: '#c4b5fd', weight: 2 }}>
            <Popup>
              <div className="font-sans text-xs">
                <p className="font-bold text-purple-700">🚔 Inspector Dispatched</p>
                <p>{d.inspector}</p>
                <p className="text-zinc-500">Vehicle: {d.vehicle}</p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function MapContainerComponent({
  gridData,
  city,
  showStations   = true,
  showFires      = true,
  showConstruction = true,
  showDispatches = true,
  dispatches     = {},
  onCellClick,
  selectedCell,
}) {
  const cityCenter = CITY_CENTERS[city] || [22.97, 78.66];
  const zoom = city ? 11 : 5;

  return (
    <div className="relative w-full h-[480px] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
      <MapContainer
        center={cityCenter}
        zoom={zoom}
        className="w-full h-full"
        zoomControl
      >
        <ChangeView center={cityCenter} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* AQI Grid */}
        <AqiGridOverlay
          gridAqi={gridData?.grid_aqi}
          cityCenter={cityCenter}
          onCellClick={onCellClick}
          selectedCell={selectedCell}
        />

        {/* CAAQMS Stations */}
        <StationOverlay
          stations={gridData?.stations}
          cityCenter={cityCenter}
          showStations={showStations}
        />

        {/* Satellite Fires */}
        <FireOverlay
          fires={gridData?.satellite_fires}
          cityCenter={cityCenter}
          showFires={showFires}
        />

        {/* Construction Sites */}
        <ConstructionOverlay
          sites={gridData?.construction_sites}
          cityCenter={cityCenter}
          showConstruction={showConstruction}
        />

        {/* Dispatches */}
        <DispatchOverlay
          dispatches={dispatches}
          cityCenter={cityCenter}
          showDispatches={showDispatches}
        />
      </MapContainer>

      {/* AQI Legend */}
      <div className="absolute bottom-4 right-4 bg-zinc-950/90 border border-zinc-800 p-3 rounded-lg z-[1000] text-[10px] space-y-1.5 backdrop-blur-md">
        <p className="font-semibold text-zinc-300 border-b border-zinc-800 pb-1 text-xs">AQI Scale</p>
        {[
          ['Good',        '#22c55e', '0–50'],
          ['Satisfactory','#84cc16', '51–100'],
          ['Moderate',    '#eab308', '101–200'],
          ['Poor',        '#f97316', '201–300'],
          ['Very Poor',   '#ef4444', '301–400'],
          ['Severe',      '#a855f7', '401+'],
        ].map(([l, c, r]) => (
          <div key={l} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
            <span className="text-zinc-400">{l} <span className="text-zinc-600">({r})</span></span>
          </div>
        ))}
      </div>

      {/* Meteorology mini HUD */}
      {gridData?.meteorology && (
        <div className="absolute top-3 left-3 bg-zinc-950/85 border border-zinc-800 px-3 py-2 rounded-lg z-[1000] text-[10px] backdrop-blur-md space-y-0.5">
          <p className="text-zinc-500 font-semibold">💨 Wind {gridData.meteorology.wind_direction}° · {gridData.meteorology.wind_speed} km/h</p>
          <p className="text-zinc-500">🌡 {gridData.meteorology.temperature}°C · 💧 {gridData.meteorology.humidity}%</p>
        </div>
      )}
    </div>
  );
}



