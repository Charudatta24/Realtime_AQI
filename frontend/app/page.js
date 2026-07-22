'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Wind, MapPin, ShieldAlert, Globe, Activity, Cpu,
  RefreshCw, Eye, Layers, BarChart3, Sparkles, Loader2
} from 'lucide-react';
import { getAqiColor, getAqiLabel } from '../utils/aqi';

// ── Dynamically loaded components (SSR-unsafe or heavy) ──────────────────────
const MapContainerComponent = dynamic(() => import('../components/MapContainer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-[480px] bg-zinc-900 border border-zinc-800 rounded-xl">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-t-emerald-500 border-zinc-700 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-zinc-400 text-xs">Loading geospatial engine…</p>
      </div>
    </div>
  ),
});

import AttributionPanel   from '../components/AttributionPanel';
import ForecastPanel      from '../components/ForecastPanel';
import EnforcementPanel   from '../components/EnforcementPanel';
import AdvisoryPanel      from '../components/AdvisoryPanel';
import InterventionPanel  from '../components/InterventionPanel';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
const CITIES   = ['Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Kolkata'];
const TABS     = [
  { id: 'map',           label: 'Live Map',        icon: MapPin     },
  { id: 'attribution',  label: 'Attribution',     icon: Layers     },
  { id: 'forecast',     label: 'Forecast',         icon: BarChart3  },
  { id: 'enforcement',  label: 'Enforcement',      icon: ShieldAlert },
  { id: 'interventions',label: 'AI Interventions', icon: Sparkles   },
  { id: 'advisory',     label: 'Advisory',         icon: Eye        },
];

// ── Layer toggle default state ────────────────────────────────────────────────
const LAYER_DEFAULTS = {
  stations: true, fires: true, construction: true, dispatches: true,
};

export default function Home() {
  const [city, setCity]             = useState('Delhi');
  const [gridData, setGridData]     = useState(null);
  const [loading, setLoading]       = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [timeMode, setTimeMode]     = useState('live');   // 'live'|'+24'|'+48'|'+72'
  const [activeTab, setActiveTab]   = useState('map');
  const [layers, setLayers]         = useState(LAYER_DEFAULTS);
  const [dispatches, setDispatches] = useState({});

  // ── Fetch grid data ────────────────────────────────────────────────────────
  const fetchGrid = useCallback(async (cityName, mode) => {
    setLoading(true);
    try {
      let url;
      if (mode === 'live') {
        url = `${API_BASE}/api/metrics/grid-data?city=${cityName}`;
      } else {
        const hours = { '+24': 24, '+48': 48, '+72': 72 }[mode];
        url = `${API_BASE}/api/metrics/forecast?city=${cityName}&hours=${hours}`;
      }
      const res  = await fetch(url);
      const data = await res.json();
      setGridData(data);
    } catch (e) {
      console.error('Grid fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on city or time change
  useEffect(() => { fetchGrid(city, timeMode); }, [city, timeMode, fetchGrid]);

  // Auto-refresh every 60s in live mode
  useEffect(() => {
    if (timeMode !== 'live') return;
    const id = setInterval(() => fetchGrid(city, 'live'), 60000);
    return () => clearInterval(id);
  }, [city, timeMode, fetchGrid]);

  const handleDispatch = (recId, details) => {
    setDispatches(prev => ({ ...prev, [recId]: details }));
  };

  const handleCellClick = (cell) => {
    setSelectedCell(cell);
    // Auto-switch to attribution tab when cell is clicked
    if (activeTab === 'map') setActiveTab('attribution');
  };

  const avgAqi = gridData?.grid_aqi
    ? Math.round(gridData.grid_aqi.flat().reduce((s, v) => s + v, 0) / 100)
    : null;

  const toggleLayer = (key) => setLayers(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#07070a]/95 backdrop-blur-md border-b border-zinc-800/80 px-5 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-purple-600 flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <Wind className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              AeroVigil
              <span className="text-[9px] text-emerald-400 font-semibold ml-2 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                Urban Air Intelligence
              </span>
            </h1>
            <p className="text-[9px] text-zinc-600 hidden sm:block">AI-Powered | 5 Indian Metros | Real-time Grid</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* City Selector */}
          <div className="flex gap-1">
            {CITIES.map(c => (
              <button
                key={c}
                onClick={() => setCity(c)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition-all border ${
                  city === c
                    ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* AQI badge */}
          {avgAqi != null && (
            <div className="text-[10px] font-bold px-2 py-1 rounded-lg border"
              style={{ color: getAqiColor(avgAqi), borderColor: `${getAqiColor(avgAqi)}40`, background: `${getAqiColor(avgAqi)}12` }}>
              AQI {avgAqi} · {getAqiLabel(avgAqi)}
            </div>
          )}

          {/* Refresh */}
          <button onClick={() => fetchGrid(city, timeMode)}
            className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-2 py-1.5 rounded-lg cursor-pointer transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            Refresh
          </button>

          {/* Digital Twin Link */}
          <Link href="/digital-twin"
            className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 hover:border-emerald-500/50 hover:bg-emerald-500/15 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all">
            <Cpu className="w-3.5 h-3.5" />
            3D Twin
          </Link>
        </div>
      </header>

      <div className="flex-1 flex flex-col p-4 md:p-5 gap-5">

        {/* ── METRIC CARDS ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetCard label="City Avg AQI"   value={avgAqi ?? '—'}
            sub={avgAqi ? getAqiLabel(avgAqi) : 'Loading…'}
            color={avgAqi ? getAqiColor(avgAqi) : '#71717a'}
            loading={loading} />
          <MetCard label="CAAQMS Active" value={gridData?.stations?.length ?? '—'}
            sub="Monitoring stations" color="#60a5fa" />
          <MetCard label="Fire Hotspots" value={gridData?.satellite_fires?.length ?? '—'}
            sub="Satellite detections" color="#f97316" />
          <MetCard label="Dispatched"    value={Object.keys(dispatches).length}
            sub="Inspector teams" color="#a78bfa" />
        </div>

        {/* ── TIME SCRUBBER ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">View:</span>
          {['live', '+24', '+48', '+72'].map(mode => (
            <button key={mode} onClick={() => setTimeMode(mode)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg border cursor-pointer transition-all ${
                timeMode === mode
                  ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                  : 'border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
              }`}>
              {mode === 'live' ? '🔴 Live' : `+${mode.slice(1)}h`}
            </button>
          ))}
          {timeMode !== 'live' && (
            <span className="text-[10px] text-zinc-500 ml-1">Forecast mode — {timeMode.slice(1)}h ahead</span>
          )}
        </div>

        {/* ── MAIN LAYOUT ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 flex-1">

          {/* ─ LEFT SIDEBAR ────────────────────────────────────────────── */}
          <aside className="lg:col-span-1 space-y-4">

            {/* Layer toggles */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Layers className="w-3 h-3" /> Map Layers
              </p>
              {[
                { key: 'stations',     label: 'CAAQMS Stations', color: 'bg-cyan-500'    },
                { key: 'fires',        label: 'Satellite Fires',  color: 'bg-red-500'     },
                { key: 'construction', label: 'Construction',     color: 'bg-orange-500'  },
                { key: 'dispatches',   label: 'Dispatches',       color: 'bg-purple-500'  },
              ].map(({ key, label, color }) => (
                <button key={key} onClick={() => toggleLayer(key)}
                  className="w-full flex items-center gap-2.5 py-1.5 text-xs cursor-pointer group">
                  <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all ${
                    layers[key] ? `${color} border-transparent` : 'border-zinc-600 bg-transparent'
                  }`}>
                    {layers[key] && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                  </div>
                  <span className={layers[key] ? 'text-zinc-300' : 'text-zinc-600'}>{label}</span>
                </button>
              ))}
            </div>

            {/* Selected Cell Card */}
            {selectedCell && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-2">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-emerald-400" /> Selected Cell
                </p>
                <p className="text-xs text-zinc-400">Row {selectedCell.row} · Col {selectedCell.col}</p>
                <p className="text-lg font-bold font-mono" style={{ color: getAqiColor(selectedCell.aqi ?? 0) }}>
                  AQI {selectedCell.aqi ?? gridData?.grid_aqi?.[selectedCell.row]?.[selectedCell.col] ?? '—'}
                </p>
                <p className="text-[10px] text-zinc-500">Click a tab to analyse</p>
              </div>
            )}

            {/* Meteorology Card */}
            {gridData?.meteorology && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-1.5">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Wind className="w-3 h-3 text-sky-400" /> Meteorology
                </p>
                {[
                  ['Temp',           `${gridData.meteorology.temperature}°C`],
                  ['Humidity',       `${gridData.meteorology.humidity}%`],
                  ['Wind',           `${gridData.meteorology.wind_speed} km/h @ ${gridData.meteorology.wind_direction}°`],
                  ['Mixing Height',  `${gridData.meteorology.mixing_height}m`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[10px]">
                    <span className="text-zinc-500">{k}</span>
                    <span className="text-zinc-300 font-mono">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* ─ CENTER / TAB AREA ──────────────────────────────────────── */}
          <div className="lg:col-span-4 flex flex-col gap-4">

            {/* Tab Bar */}
            <div className="flex items-center gap-1 border-b border-zinc-800 pb-0 overflow-x-auto">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 cursor-pointer transition-all whitespace-nowrap ${
                    activeTab === id
                      ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {id === 'interventions' && (
                    <span className="text-[8px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-1 py-0.5 rounded">AI</span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1">
              {activeTab === 'map' && (
                <div className="space-y-3">
                  <MapContainerComponent
                    gridData={gridData}
                    city={city}
                    timeMode={timeMode}
                    showStations={layers.stations}
                    showFires={layers.fires}
                    showConstruction={layers.construction}
                    showDispatches={layers.dispatches}
                    dispatches={dispatches}
                    onCellClick={handleCellClick}
                    selectedCell={selectedCell}
                  />
                </div>
              )}

              {activeTab === 'attribution' && (
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-5">
                  <h2 className="text-sm font-bold text-zinc-200 mb-4 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-zinc-400" />
                    Source Attribution
                    {selectedCell && <span className="text-zinc-500 text-xs font-normal">— Cell ({selectedCell.row},{selectedCell.col})</span>}
                  </h2>
                  <AttributionPanel city={city} selectedCell={selectedCell} timestamp={null} />
                </div>
              )}

              {activeTab === 'forecast' && (
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-5">
                  <h2 className="text-sm font-bold text-zinc-200 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-zinc-400" /> 24–72h Hyperlocal Forecast
                  </h2>
                  <ForecastPanel
                    city={city}
                    selectedCell={selectedCell}
                    currentAqi={
                      selectedCell && gridData?.grid_aqi
                        ? gridData.grid_aqi[selectedCell.row]?.[selectedCell.col]
                        : null
                    }
                    timestamp={null}
                  />
                </div>
              )}

              {activeTab === 'enforcement' && (
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-5">
                  <h2 className="text-sm font-bold text-zinc-200 mb-4 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-zinc-400" /> Enforcement Priority Intelligence
                  </h2>
                  <EnforcementPanel city={city} onDispatchSuccess={handleDispatch} />
                </div>
              )}

              {activeTab === 'interventions' && (
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-5">
                  <h2 className="text-sm font-bold text-zinc-200 mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    AI Intervention Recommendation Engine
                    <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-semibold">NEW</span>
                  </h2>
                  <InterventionPanel city={city} />
                </div>
              )}

              {activeTab === 'advisory' && (
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-5">
                  <h2 className="text-sm font-bold text-zinc-200 mb-4 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-zinc-400" /> Citizen Health Advisory
                    {selectedCell && <span className="text-zinc-500 text-xs font-normal">— Cell ({selectedCell.row},{selectedCell.col})</span>}
                  </h2>
                  <AdvisoryPanel city={city} selectedCell={selectedCell} timestamp={null} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── FOOTER ────────────────────────────────────────────────────── */}
        <footer className="border-t border-zinc-900 pt-4 flex justify-between text-[10px] text-zinc-700">
          <span>© 2026 AeroVigil Environmental Analytics — CPCB Framework Compliant</span>
          <span>Simulation engine · Click any tab to analyse · <Link href="/digital-twin" className="text-emerald-600 hover:text-emerald-400">3D Digital Twin →</Link></span>
        </footer>
      </div>
    </div>
  );
}

// ── Helper Component ──────────────────────────────────────────────────────────
function MetCard({ label, value, sub, color, loading }) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 hover:border-zinc-700/50 transition-colors">
      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-bold font-mono mt-1.5" style={{ color }}>
        {loading && value === '—' ? <Loader2 className="w-5 h-5 animate-spin inline" /> : value}
      </p>
      <p className="text-[9px] text-zinc-600 mt-0.5">{sub}</p>
    </div>
  );
}
