'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Cpu, ArrowLeft, RefreshCw, Layers, Wind,
  Flame, Building2, Factory, Radio, Loader2, ChevronDown
} from 'lucide-react';
import { getAqiLabel, getAqiColor } from '../../utils/aqi';

// Load DigitalTwin3D lazily (Three.js is SSR-incompatible)
const DigitalTwin3D = dynamic(() => import('../../components/DigitalTwin3D'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full gap-3 text-zinc-500">
      <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      <span className="text-sm">Initialising 3D City Engine…</span>
    </div>
  ),
});

const CITIES = ['Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Kolkata'];

const LAYER_OPTIONS = [
  { key: 'fires',        label: 'Satellite Fires',   icon: Flame,    color: 'text-red-400'  },
  { key: 'construction', label: 'Construction',       icon: Building2, color: 'text-orange-400' },
  { key: 'industries',   label: 'Industry Stacks',   icon: Factory,  color: 'text-purple-400' },
  { key: 'stations',     label: 'CAAQMS Stations',   icon: Radio,    color: 'text-cyan-400'  },
  { key: 'wind',         label: 'Wind Arrow',         icon: Wind,     color: 'text-emerald-400' },
];

export default function DigitalTwinPage() {
  const [city, setCity]               = useState('Delhi');
  const [gridData, setGridData]       = useState(null);
  const [loading, setLoading]         = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [layers, setLayers]           = useState({
    fires: true, construction: true, industries: true, stations: true, wind: true,
  });
  const [cityOpen, setCityOpen]       = useState(false);
  const pollingRef = useRef(null);

  const fetchData = async (cityName) => {
    setLoading(true);
    try {
      const res = await fetch(`https://realtime-aqi-1u9g.onrender.com//api/metrics/grid-data?city=${cityName}`);
      const d   = await res.json();
      // Filter overlays by active layers
      setGridData({
        ...d,
        satellite_fires:    layers.fires        ? d.satellite_fires   : [],
        construction_sites: layers.construction ? d.construction_sites : [],
        industries:         layers.industries   ? d.industries        : [],
        stations:           layers.stations     ? d.stations          : [],
        meteorology:        layers.wind         ? d.meteorology       : null,
      });
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on city or layer change
  useEffect(() => {
    fetchData(city);
  }, [city, layers]);

  // Live polling every 30s
  useEffect(() => {
    pollingRef.current = setInterval(() => fetchData(city), 30000);
    return () => clearInterval(pollingRef.current);
  }, [city, layers]);

  const toggleLayer = (key) => setLayers(prev => ({ ...prev, [key]: !prev[key] }));

  const avgAqi = gridData?.grid_aqi
    ? Math.round(gridData.grid_aqi.flat().reduce((s, v) => s + v, 0) / 100)
    : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Topbar */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h1 className="font-bold text-zinc-100 text-sm tracking-tight">
              AeroVigil Digital Twin <span className="text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded px-1.5 py-0.5 ml-1">3D</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* City Selector */}
          <div className="relative">
            <button
              onClick={() => setCityOpen(o => !o)}
              className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 hover:border-zinc-600 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {city}
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>
            {cityOpen && (
              <div className="absolute top-full right-0 mt-1 w-36 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-50">
                {CITIES.map(c => (
                  <button key={c} onClick={() => { setCity(c); setCityOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs cursor-pointer transition-colors ${c === city ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-300 hover:bg-zinc-800'}`}>
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Avg AQI Badge */}
          {avgAqi != null && (
            <div className="text-xs font-bold px-2.5 py-1 rounded-lg border"
              style={{ color: getAqiColor(avgAqi), borderColor: `${getAqiColor(avgAqi)}40`, background: `${getAqiColor(avgAqi)}10` }}>
              AQI {avgAqi} · {getAqiLabel(avgAqi)}
            </div>
          )}

          {/* Refresh */}
          <button onClick={() => fetchData(city)}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar — Layer Controls */}
        <aside className="w-52 shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col gap-5 p-4 overflow-y-auto">
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Layers className="w-3 h-3" /> Layer Control
            </p>
            <div className="space-y-1.5">
              {LAYER_OPTIONS.map(({ key, label, icon: Icon, color }) => (
                <button
                  key={key}
                  onClick={() => toggleLayer(key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all border
                    ${layers[key]
                      ? `bg-zinc-800/80 border-zinc-700 ${color}`
                      : 'bg-transparent border-transparent text-zinc-600 hover:text-zinc-400'}`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${layers[key] ? 'bg-zinc-600 border-zinc-500' : 'border-zinc-700'}`}>
                    {layers[key] && <div className="w-2 h-2 rounded-sm bg-zinc-200" />}
                  </div>
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${layers[key] ? color : 'text-zinc-600'}`} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Meteorology Stats */}
          {gridData?.meteorology && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-[10px] space-y-2">
              <p className="font-semibold text-zinc-400 uppercase tracking-wider">Meteorology</p>
              <MetRow label="Temperature"    value={`${gridData.meteorology.temperature}°C`} />
              <MetRow label="Humidity"       value={`${gridData.meteorology.humidity}%`} />
              <MetRow label="Wind Speed"     value={`${gridData.meteorology.wind_speed} km/h`} />
              <MetRow label="Wind Dir"       value={`${gridData.meteorology.wind_direction}°`} />
              <MetRow label="Mixing Height"  value={`${gridData.meteorology.mixing_height}m`} />
            </div>
          )}

          {/* Selected Cell Info */}
          {selectedCell && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-[10px] space-y-2">
              <p className="font-semibold text-zinc-400 uppercase tracking-wider">Selected Cell</p>
              <MetRow label="Row / Col" value={`${selectedCell.row} / ${selectedCell.col}`} />
              <MetRow label="AQI" value={selectedCell.aqi} />
              <div className="mt-2">
                <Link
                  href={`/?city=${city}&row=${selectedCell.row}&col=${selectedCell.col}`}
                  className="block text-center px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold transition-colors"
                >
                  Analyse in 2D Dashboard →
                </Link>
              </div>
            </div>
          )}

          {/* Scene Stats */}
          {gridData && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-[10px] space-y-1.5">
              <p className="font-semibold text-zinc-400 uppercase tracking-wider">Scene Objects</p>
              <MetRow label="Grid Cells"    value="100 (10×10)" />
              <MetRow label="CAAQMS"        value={gridData.stations?.length ?? 0} />
              <MetRow label="Fires"         value={gridData.satellite_fires?.length ?? 0} />
              <MetRow label="Construction"  value={gridData.construction_sites?.length ?? 0} />
              <MetRow label="Industry"      value={gridData.industries?.length ?? 0} />
            </div>
          )}
        </aside>

        {/* 3D Canvas — fills remaining space */}
        <main className="flex-1 min-h-0 relative">
          {loading && !gridData && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 z-30">
              <div className="flex items-center gap-3 text-zinc-400 text-sm">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                Fetching city data…
              </div>
            </div>
          )}
          <DigitalTwin3D
            gridData={gridData}
            selectedCell={selectedCell}
            onCellClick={setSelectedCell}
          />
        </main>
      </div>
    </div>
  );
}

function MetRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200 font-mono">{value}</span>
    </div>
  );
}
