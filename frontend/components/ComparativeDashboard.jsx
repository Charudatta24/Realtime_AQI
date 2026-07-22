'use client';

import { useEffect, useState } from 'react';
import {
  Globe,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
  Lightbulb,
  Target,
  Flame,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { getAqiColor } from '../utils/aqi';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'https://realtime-aqi-1u9g.onrender.com').replace(/\/+$/, '');

const TREND_ICONS = {
  improving: <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />,
  stable: <Minus className="w-3.5 h-3.5 text-zinc-400" />,
  declining: <ArrowDown className="w-3.5 h-3.5 text-red-400" />,
};

const INSIGHT_ICONS = {
  intervention_effectiveness: <ShieldCheck className="w-4 h-4 text-cyan-400" />,
  aqi_cluster: <Target className="w-4 h-4 text-orange-400" />,
  biomass_burning: <Flame className="w-4 h-4 text-red-400" />,
  positive_deviance: <Sparkles className="w-4 h-4 text-emerald-400" />,
};

function EffGauge({ score }) {
  const color =
    score >= 0.65
      ? '#22c55e'
      : score >= 0.4
        ? '#eab308'
        : '#ef4444';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] font-mono font-bold" style={{ color }}>
        {score.toFixed(2)}
      </span>
    </div>
  );
}

function SeverityBadge({ aqi }) {
  if (aqi <= 50)
    return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border text-green-400 bg-green-500/10 border-green-500/20">Good</span>;
  if (aqi <= 100)
    return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border text-lime-400 bg-lime-500/10 border-lime-500/20">Satisfactory</span>;
  if (aqi <= 200)
    return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border text-yellow-400 bg-yellow-500/10 border-yellow-500/20">Moderate</span>;
  if (aqi <= 300)
    return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border text-orange-400 bg-orange-500/10 border-orange-500/20">Poor</span>;
  if (aqi <= 400)
    return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border text-red-400 bg-red-500/10 border-red-500/20">Very Poor</span>;
  return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border text-purple-400 bg-purple-500/10 border-purple-500/20">Severe</span>;
}

export default function ComparativeDashboard({ onCitySelect }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState('aqi');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    const fetchComparison = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/metrics/city-comparison`);
        if (!res.ok) return;
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('Error fetching city comparison:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchComparison();
  }, []);

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-blue-500 border-zinc-700 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-zinc-400">Loading cross-city comparative intelligence...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
        <Globe className="w-10 h-10 text-zinc-600 mb-2" />
        <p className="text-zinc-400 font-medium">Multi-City Comparison</p>
        <p className="text-xs text-zinc-500 max-w-xs mt-1">Loading comparative intelligence across all monitored Indian cities.</p>
      </div>
    );
  }

  const sortedCities = [...data.cities].sort((a, b) => {
    if (sortKey === 'aqi') return sortAsc ? a.current_aqi - b.current_aqi : b.current_aqi - a.current_aqi;
    if (sortKey === 'effectiveness')
      return sortAsc
        ? a.intervention_effectiveness - b.intervention_effectiveness
        : b.intervention_effectiveness - a.intervention_effectiveness;
    if (sortKey === 'name')
      return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    return 0;
  });

  const barChartData = [...data.cities]
    .sort((a, b) => b.current_aqi - a.current_aqi)
    .slice(0, 10)
    .map((c) => ({
      name: c.name,
      AQI: c.current_aqi,
    }));

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 shadow-lg backdrop-blur-sm">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-zinc-800 pb-4 mb-4">
        <div>
          <h3 className="font-semibold text-zinc-100 flex items-center gap-2 text-sm">
            <Globe className="w-4 h-4 text-blue-400" />
            Multi-City Comparative Intelligence
          </h3>
          <p className="text-[10px] text-zinc-500 mt-1">
            Cross-city AQI trends, intervention effectiveness, and compliance metrics — enabling
            administrators to learn from interventions that worked.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-lg p-3">
          <p className="text-[9px] uppercase tracking-wider text-zinc-500">National Avg AQI</p>
          <p className="text-xl font-bold text-zinc-100 mt-1">{data.summary.national_average_aqi}</p>
        </div>
        <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-lg p-3">
          <p className="text-[9px] uppercase tracking-wider text-zinc-500">Worst City</p>
          <p className="text-lg font-bold text-red-400 mt-1">{data.summary.worst_city}</p>
          <p className="text-[10px] text-zinc-500">{data.summary.worst_aqi} AQI</p>
        </div>
        <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-lg p-3">
          <p className="text-[9px] uppercase tracking-wider text-zinc-500">Best City</p>
          <p className="text-lg font-bold text-emerald-400 mt-1">{data.summary.best_city}</p>
          <p className="text-[10px] text-zinc-500">{data.summary.best_aqi} AQI</p>
        </div>
        <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-lg p-3">
          <p className="text-[9px] uppercase tracking-wider text-zinc-500">Improving</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">{data.summary.cities_improving}</p>
          <p className="text-[10px] text-zinc-500">of {data.total_cities} cities</p>
        </div>
      </div>

      {/* Bar chart: top 10 worst */}
      <div className="mb-5 bg-zinc-950/40 rounded-lg border border-zinc-800/60 p-3">
        <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-3 flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-zinc-400" />
          Top 10 Worst AQI Rankings
        </h4>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} layout="vertical" margin={{ left: 60, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
              <XAxis type="number" domain={[0, 500]} stroke="#71717a" fontSize={10} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                width={55}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#09090b',
                  borderColor: '#27272a',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#a1a1aa', fontSize: '11px' }}
                itemStyle={{ color: '#3b82f6', fontSize: '12px' }}
              />
              <Bar dataKey="AQI" fill="#3b82f6" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sort tabs */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Sort by:</span>
        {[
          { key: 'aqi', label: 'AQI' },
          { key: 'effectiveness', label: 'Effectiveness' },
          { key: 'name', label: 'City' },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => {
              if (sortKey === opt.key) setSortAsc(!sortAsc);
              else {
                setSortKey(opt.key);
                setSortAsc(false);
              }
            }}
            className={`text-[10px] px-2 py-0.5 rounded border font-semibold transition cursor-pointer ${
              sortKey === opt.key
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-zinc-600'
            }`}
          >
            {opt.label} {sortKey === opt.key && (sortAsc ? '↑' : '↓')}
          </button>
        ))}
      </div>

      {/* City rows */}
      <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1 mb-5">
        {sortedCities.map((city) => (
          <button
            key={city.name}
            onClick={() => onCitySelect && onCitySelect(city.name)}
            className="w-full text-left p-2.5 rounded-lg border bg-zinc-950/40 border-zinc-800/60 hover:border-zinc-700/60 hover:bg-zinc-900/60 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">
                  {city.name}
                </span>
                <SeverityBadge aqi={city.current_aqi} />
                <span className="text-[10px] text-zinc-500 font-mono">{city.primary_pollutant}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1">
                  {TREND_ICONS[city.improvement_trend]}
                  <EffGauge score={city.intervention_effectiveness} />
                </div>
                <span
                  className="text-sm font-bold font-mono"
                  style={{ color: getAqiColor(city.current_aqi) }}
                >
                  {city.current_aqi}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1 text-[9px] text-zinc-500">
              <span>
                Hotspots:{' '}
                <strong className="text-zinc-400">{city.compliance.hotspot_count}</strong>
              </span>
              <span>
                Severe zones:{' '}
                <strong className="text-red-400">{city.compliance.severe_zone_count}</strong>
              </span>
              <span className="text-zinc-600">
                Stations: {city.compliance.station_count}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Cross-city insights */}
      {data.cross_city_insights.length > 0 && (
        <div className="border-t border-zinc-800 pt-4">
          <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-3 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            Cross-City Intelligence Insights
          </h4>
          <div className="space-y-3">
            {data.cross_city_insights.map((insight, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border bg-zinc-950/60 border-zinc-800/70"
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">
                    {INSIGHT_ICONS[insight.type] || <Lightbulb className="w-4 h-4 text-zinc-500" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-zinc-200 leading-relaxed">{insight.insight}</p>
                    {insight.recommendation && (
                      <div className="mt-2 flex items-start gap-1.5 bg-blue-950/20 border border-blue-900/20 p-2 rounded">
                        <Target className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
                        <p className="text-[10px] text-blue-300 leading-relaxed">
                          <strong>Recommendation</strong>: {insight.recommendation}
                        </p>
                      </div>
                    )}
                    {insight.applicable_cities && insight.applicable_cities.length > 0 && (
                      <p className="text-[9px] text-zinc-500 mt-1.5">
                        Applicable to: <strong className="text-zinc-400">{insight.applicable_cities.join(', ')}</strong>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



