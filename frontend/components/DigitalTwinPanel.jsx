'use client';

import { useEffect, useState } from 'react';
import { Layers, Activity, Sparkles, Globe, RotateCcw } from 'lucide-react';
import { getAqiColor } from '../utils/aqi';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://realtime-aqi-1u9g.onrender.com/';
const SCENARIOS = [
  { key: 'road_closure', label: 'Road Closure' },
  { key: 'construction_restriction', label: 'Construction Restriction' },
  { key: 'combined', label: 'Combined Intervention' }
];

export default function DigitalTwinPanel({ city }) {
  const [scenario, setScenario] = useState('road_closure');
  const [twinData, setTwinData] = useState(null);
  const [agentData, setAgentData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!city) return;

    const fetchAgentSummary = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/metrics/agents?city=${encodeURIComponent(city)}`);
        if (!res.ok) return;
        const json = await res.json();
        setAgentData(json);
      } catch (err) {
        console.error('Error fetching multi-agent summary:', err);
      }
    };

    fetchAgentSummary();
  }, [city]);

  useEffect(() => {
    if (!city) return;

    const fetchTwin = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/metrics/digital-twin?city=${encodeURIComponent(city)}&scenario=${scenario}`);
        if (!res.ok) {
          setTwinData(null);
          return;
        }
        const json = await res.json();
        setTwinData(json);
      } catch (err) {
        console.error('Error fetching digital twin data:', err);
        setTwinData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTwin();
  }, [city, scenario]);

  const color = twinData ? getAqiColor(twinData.scenario_average_aqi) : '#84cc16';

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 shadow-lg backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-zinc-800 pb-4 mb-4">
        <div>
          <h3 className="font-semibold text-zinc-100 flex items-center gap-2 text-sm">
            <Layers className="w-4 h-4 text-cyan-400" />
            Digital Twin & Scenario Planner
          </h3>
          <p className="text-[10px] text-zinc-500 mt-1">
            Simulate road closures or construction restrictions and compare predicted air quality impacts.
          </p>
        </div>
        <div className="flex gap-2 items-center text-[11px] text-zinc-400">
          <RotateCcw className="w-4 h-4" />
          <span>Multi-agent orchestration enabled</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {SCENARIOS.map((item) => (
          <button
            key={item.key}
            onClick={() => setScenario(item.key)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${scenario === item.key ? 'border-cyan-500 bg-cyan-500/10 text-cyan-200' : 'border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-zinc-400 text-xs">
          <div className="w-8 h-8 border-2 border-t-cyan-400 border-zinc-700 rounded-full animate-spin mr-3" />
          Simulating intervention impacts...
        </div>
      ) : twinData ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Baseline Avg AQI</p>
              <p className="text-2xl font-bold text-zinc-100 mt-2">{twinData.baseline_average_aqi}</p>
            </div>
            <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Scenario Avg AQI</p>
              <p className="text-2xl font-bold" style={{ color }}>{twinData.scenario_average_aqi}</p>
            </div>
            <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Avg Reduction</p>
              <p className="text-2xl font-bold text-emerald-400 mt-2">{twinData.average_aqi_reduction}</p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-xs leading-relaxed text-zinc-300">
            <p className="font-semibold text-zinc-100 mb-2">Scenario Summary</p>
            <p>{twinData.scenario_description}</p>
          </div>

          {agentData && agentData.agents && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-3">Agent Coordination Snapshot</p>
              <div className="space-y-3">
                {agentData.agents.slice(0, 3).map((agent) => (
                  <div key={agent.agent} className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/80">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{agent.agent}</p>
                    <p className="text-sm font-semibold text-zinc-100">{agent.role}</p>
                    <p className="text-[11px] text-zinc-400 mt-2">{agent.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-10 text-center text-zinc-500 text-xs">No digital twin results available yet.</div>
      )}
    </div>
  );
}
