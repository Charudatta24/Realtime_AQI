'use client';

import { useEffect, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import { ShieldAlert, Info } from 'lucide-react';

const COLORS = {
  "Vehicular Exhaust": "#3b82f6",          // Blue
  "Industrial Stacks": "#8b5cf6",          // Purple
  "Construction Dust": "#f97316",          // Orange
  "Biomass & Waste Burning": "#ef4444",    // Red
  "Regional & Secondary Aerosols": "#10b981" // Emerald
};

export default function AttributionPanel({ city, selectedCell, timestamp }) {
  const [attributionData, setAttributionData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedCell) return;
    
    const fetchAttribution = async () => {
      setLoading(true);
      try {
        const timeParam = timestamp ? `&time=${timestamp}` : '';
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'https://realtime-aqi-1u9g.onrender.com/'}/api/metrics/attribution?city=${city}&row=${selectedCell.row}&col=${selectedCell.col}${timeParam}`);
        const data = await res.json();
        setAttributionData(data);
      } catch (err) {
        console.error("Error fetching source attribution:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttribution();
  }, [city, selectedCell, timestamp]);

  if (!selectedCell) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 h-[320px] flex flex-col items-center justify-center text-center">
        <Info className="w-10 h-10 text-zinc-600 mb-2" />
        <p className="text-zinc-400 font-medium">No Cell Selected</p>
        <p className="text-xs text-zinc-500 max-w-xs mt-1">Click any grid cell on the geospatial map to analyze localized pollution source attribution.</p>
      </div>
    );
  }

  if (loading || !attributionData) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 h-[320px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-purple-500 border-zinc-700 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-zinc-400">Computing source attribution weights...</p>
        </div>
      </div>
    );
  }

  // Convert API attributions map to array for Recharts
  const chartData = Object.entries(attributionData.attributions).map(([name, value]) => ({
    name,
    value
  })).filter(item => item.value > 0);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 shadow-lg backdrop-blur-sm flex flex-col h-[380px]">
      <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
        <div>
          <h3 className="font-semibold text-zinc-100 flex items-center gap-1.5 text-sm">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            Source Attribution
          </h3>
          <p className="text-[10px] text-zinc-500 uppercase mt-0.5 font-semibold">
            Grid Position: Ward Cell ({selectedCell.row}, {selectedCell.col})
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
            Confidence: {attributionData.confidence}%
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row items-center justify-between min-h-0 py-2">
        <div className="w-full md:w-1/2 h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                itemStyle={{ color: '#f4f4f5', fontSize: '12px' }}
                formatter={(value) => [`${value}%`, 'Contribution']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="w-full md:w-1/2 space-y-2.5 max-h-[190px] overflow-y-auto pr-1">
          {chartData.map((item, idx) => (
            <div key={idx} className="flex flex-col text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-zinc-300 font-medium truncate max-w-[120px]">
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: COLORS[item.name] }}></span>
                  {item.name}
                </span>
                <span className="font-bold text-zinc-200">{item.value}%</span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500" 
                  style={{ width: `${item.value}%`, backgroundColor: COLORS[item.name] }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto border-t border-zinc-800/80 pt-3 flex items-start gap-2 bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800/50">
        <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0 mt-0.5 animate-pulse" />
        <p className="text-[10px] text-zinc-400 leading-normal">
          <strong>Dispersion Notice</strong>: Downwind vector from stack stacks and active construction zones attributes local particulate peaks. Ground monitoring validation active.
        </p>
      </div>
    </div>
  );
}
