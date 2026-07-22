'use client';

import { useEffect, useState } from 'react';
import {
  Sparkles, AlertTriangle, Clock, DollarSign,
  Building2, Flame, Wind, Car, Megaphone,
  CheckCircle2, ChevronDown, ChevronUp, TrendingDown, Loader2
} from 'lucide-react';

const CATEGORY_ICONS = {
  "Traffic Management":   { icon: Car,       color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20" },
  "Construction Control": { icon: Building2,  color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  "Industrial Control":   { icon: Wind,       color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  "Fire & Biomass":       { icon: Flame,      color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20" },
  "Active Mitigation":    { icon: Wind,       color: "text-cyan-400",   bg: "bg-cyan-500/10",   border: "border-cyan-500/20" },
  "Public Advisory":      { icon: Megaphone,  color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
};

const PRIORITY_STYLE = {
  Critical: "bg-red-500/15 text-red-400 border-red-500/30",
  High:     "bg-orange-500/15 text-orange-400 border-orange-500/30",
  Medium:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};

export default function InterventionPanel({ city }) {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [expanded, setExpanded]   = useState({});
  const [approved, setApproved]   = useState({});
  const [approverName, setApprover] = useState('City Commissioner');
  const [approveModal, setApproveModal] = useState(null);

  useEffect(() => {
    if (!city) return;
    setLoading(true);
    setData(null);
    fetch(`https://realtime-aqi-1u9g.onrender.com//api/metrics/interventions?city=${city}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(err => console.error('Interventions fetch error:', err))
      .finally(() => setLoading(false));
  }, [city]);

  const handleApprove = async (iv) => {
    try {
      await fetch('https://realtime-aqi-1u9g.onrender.com//api/metrics/interventions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervention_id: iv.id, approved_by: approverName, notes: '' })
      });
      setApproved(prev => ({ ...prev, [iv.id]: true }));
    } catch (e) {
      console.error(e);
    } finally {
      setApproveModal(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-40 text-zinc-500 gap-2 text-sm">
      <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
      Generating AI intervention recommendations…
    </div>
  );

  if (!data) return null;

  const { current_summary, forecast_summary, interventions, impact_summary } = data;

  return (
    <div className="space-y-5">
      {/* Summary Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Current AQI" value={current_summary.avg_aqi} sub={current_summary.severity}
          color={aqi_color_class(current_summary.avg_aqi)} />
        <SummaryCard label="24h Forecast" value={forecast_summary.avg_aqi_24h}
          sub={current_summary.trend} color={aqi_color_class(forecast_summary.avg_aqi_24h)} />
        <SummaryCard label="Interventions" value={impact_summary.intervention_count}
          sub="AI recommended" color="text-emerald-400" />
        <SummaryCard label="AQI Reduction"
          value={`${impact_summary.projected_aqi_reduction_min}–${impact_summary.projected_aqi_reduction_max}`}
          sub="pts if all approved" color="text-cyan-400" />
      </div>

      {/* Projected AQI after all interventions bar */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="text-zinc-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
            Projected City AQI if all interventions approved
          </span>
          <span className="font-mono text-zinc-200">
            {current_summary.avg_aqi} → {impact_summary.projected_aqi_after_min}–{impact_summary.projected_aqi_after_max}
          </span>
        </div>
        <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-500 via-orange-400 to-emerald-500 transition-all duration-700"
            style={{ width: `${Math.min(100, (impact_summary.projected_aqi_after_max / 500) * 100)}%` }}
          />
        </div>
      </div>

      {/* Intervention Cards */}
      <div className="space-y-3">
        {interventions.map((iv) => {
          const catStyle = CATEGORY_ICONS[iv.category] || CATEGORY_ICONS["Public Advisory"];
          const CatIcon  = catStyle.icon;
          const isExpanded = expanded[iv.id];
          const isApproved = approved[iv.id] || iv.status === 'Approved';

          return (
            <div
              key={iv.id}
              className={`rounded-xl border transition-all duration-200 overflow-hidden
                ${isApproved
                  ? 'border-emerald-800/50 bg-emerald-950/20'
                  : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700/60'}`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${catStyle.bg} border ${catStyle.border}`}>
                    <CatIcon className={`w-4 h-4 ${catStyle.color}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${PRIORITY_STYLE[iv.priority_label] || PRIORITY_STYLE.Medium}`}>
                        {iv.priority_label}
                      </span>
                      <span className={`text-[10px] font-semibold ${catStyle.color}`}>{iv.category}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{iv.icon}</span>
                    </div>
                    <p className="text-xs font-semibold text-zinc-100 leading-snug">{iv.action}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {isApproved ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Approved
                    </span>
                  ) : (
                    <button
                      onClick={() => setApproveModal(iv)}
                      className="text-[10px] font-semibold px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer transition-colors"
                    >
                      Approve
                    </button>
                  )}
                  <button
                    onClick={() => setExpanded(p => ({ ...p, [iv.id]: !p[iv.id] }))}
                    className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-zinc-800/60 px-4 pb-4 pt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
                  <Detail icon={<Clock className="w-3 h-3 text-sky-400" />} label="Timeline" value={iv.timeline} />
                  <Detail icon={<DollarSign className="w-3 h-3 text-yellow-400" />} label="Cost Level" value={iv.cost_level} />
                  <Detail icon={<TrendingDown className="w-3 h-3 text-emerald-400" />} label="AQI Impact" value={iv.impact_label} />
                  <Detail icon={<Megaphone className="w-3 h-3 text-purple-400" />} label="Agency" value={iv.agency} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Approve Modal */}
      {approveModal && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="font-bold text-zinc-100 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Approve Intervention
            </h3>
            <p className="text-xs text-zinc-400 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800">
              {approveModal.icon} {approveModal.action}
            </p>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Approved by (Official Name / Designation)</label>
              <input
                type="text"
                value={approverName}
                onChange={e => setApprover(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs rounded px-3 py-2 focus:outline-none focus:border-zinc-600"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-zinc-800">
              <button onClick={() => setApproveModal(null)}
                className="px-4 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded cursor-pointer">
                Cancel
              </button>
              <button onClick={() => handleApprove(approveModal)}
                className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold cursor-pointer flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub, color }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3.5">
      <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold font-mono mt-1 ${color}`}>{value}</p>
      <p className="text-[10px] text-zinc-500 mt-0.5">{sub}</p>
    </div>
  );
}

function Detail({ icon, label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1 text-zinc-500 font-semibold uppercase tracking-wider">{icon}{label}</span>
      <span className="text-zinc-300 leading-snug">{value}</span>
    </div>
  );
}

function aqi_color_class(aqi) {
  if (aqi <= 50)  return 'text-green-400';
  if (aqi <= 100) return 'text-lime-400';
  if (aqi <= 200) return 'text-yellow-400';
  if (aqi <= 300) return 'text-orange-400';
  if (aqi <= 400) return 'text-red-400';
  return 'text-purple-400';
}
