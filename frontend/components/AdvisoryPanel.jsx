'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, Heart, AlertTriangle, Languages, Users, Home } from 'lucide-react';
import { getAqiColor } from '../utils/aqi';

export default function AdvisoryPanel({ city, selectedCell, timestamp }) {
  const [advisory, setAdvisory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [useRegionalLanguage, setUseRegionalLanguage] = useState(true);

  useEffect(() => {
    if (!selectedCell) return;

    const fetchAdvisory = async () => {
      setLoading(true);
      try {
        const timeParam = timestamp ? `&time=${timestamp}` : '';
        const res = await fetch(`${(process.env.NEXT_PUBLIC_API_BASE || 'https://realtime-aqi-1u9g.onrender.com').replace(/\/+$/, '')}/api/metrics/advisories?city=${city}&row=${selectedCell.row}&col=${selectedCell.col}${timeParam}`);
        const data = await res.json();
        setAdvisory(data);
      } catch (err) {
        console.error("Error fetching advisory:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdvisory();
  }, [city, selectedCell, timestamp]);

  if (!selectedCell) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 h-[550px] flex flex-col items-center justify-center text-center">
        <Heart className="w-10 h-10 text-zinc-600 mb-2" />
        <p className="text-zinc-400 font-medium">Public Health Risk Advisory</p>
        <p className="text-xs text-zinc-500 max-w-xs mt-1">Select a grid cell on the geospatial map to view localized citizen warning advisories and vulnerability registers.</p>
      </div>
    );
  }

  if (loading || !advisory) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 h-[550px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-rose-500 border-zinc-700 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-zinc-400">Loading public health data...</p>
        </div>
      </div>
    );
  }

  const color = getAqiColor(advisory.aqi);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 shadow-lg backdrop-blur-sm flex flex-col h-[550px] overflow-y-auto">
      <div className="flex justify-between items-start border-b border-zinc-800 pb-3 mb-4">
        <div>
          <h3 className="font-semibold text-zinc-100 flex items-center gap-1.5 text-sm">
            <Heart className="w-4 h-4 text-rose-500" />
            Citizen Health & Vulnerability Advisor
          </h3>
          <p className="text-[10px] text-zinc-500 uppercase mt-0.5 font-semibold">
            Health Risks & Warnings
          </p>
        </div>
        <button
          onClick={() => setUseRegionalLanguage(!useRegionalLanguage)}
          className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] border border-zinc-700/50 cursor-pointer font-semibold transition-colors"
        >
          <Languages className="w-3.5 h-3.5" />
          {useRegionalLanguage ? 'Show English' : `Show ${advisory.primary_language}`}
        </button>
      </div>

      {/* Localized Alert Banner */}
      <div 
        className="p-4 rounded-lg border flex gap-3 items-start animate-fade-in"
        style={{ 
          backgroundColor: `${color}10`, 
          borderColor: `${color}40`,
        }}
      >
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 animate-pulse" style={{ color }} />
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-zinc-100 uppercase">
              {useRegionalLanguage ? advisory.translated_category : advisory.category} Category
            </h4>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: `${color}20`, color }}>
              AQI {advisory.aqi}
            </span>
          </div>
          <p className="text-xs text-zinc-200 font-medium mt-1 leading-relaxed">
            {useRegionalLanguage ? advisory.translated_alert : advisory.advice_en}
          </p>
          <p className="text-[10px] text-zinc-400 mt-2 italic leading-relaxed">
            <strong>Impact Profile</strong>: {advisory.risk_summary}
          </p>
        </div>
      </div>

      {/* Target Demographics Advisories */}
      <div className="mt-5 space-y-3.5">
        <h4 className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
          <Users className="w-3.5 h-3.5 text-zinc-500" />
          Demographic Precautions
        </h4>
        
        <div className="grid grid-cols-1 gap-2.5">
          <div className="bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/80">
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">Children & Schools</span>
            <p className="text-[11px] text-zinc-300 mt-1 leading-normal">{advisory.target_demographics.children}</p>
          </div>
          
          <div className="bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/80">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Elderly & Sensitive Groups</span>
            <p className="text-[11px] text-zinc-300 mt-1 leading-normal">{advisory.target_demographics.elderly}</p>
          </div>
          
          <div className="bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/80">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Outdoor Workers</span>
            <p className="text-[11px] text-zinc-300 mt-1 leading-normal">{advisory.target_demographics.outdoor_workers}</p>
          </div>
        </div>
      </div>

      {/* Vulnerable Infrastructure Register in this grid cell */}
      <div className="mt-5 border-t border-zinc-800/60 pt-4">
        <h4 className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider mb-3">
          <Home className="w-3.5 h-3.5 text-zinc-500" />
          Cell Vulnerability Register
        </h4>

        {advisory.vulnerable_locations.length === 0 ? (
          <div className="p-3 text-center text-zinc-500 text-[10px] bg-zinc-950/20 rounded border border-zinc-800/30">
            No public schools, hospitals, or old-age homes registered in this specific 1km grid coordinates.
          </div>
        ) : (
          <div className="space-y-2">
            {advisory.vulnerable_locations.map((loc, idx) => (
              <div key={idx} className="flex justify-between items-center p-2.5 bg-zinc-950/60 border border-zinc-850 rounded text-xs">
                <div>
                  <span className="font-semibold text-zinc-200 block text-xs">{loc.name}</span>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold mt-0.5 block">{loc.type}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                    {loc.count} Exposed
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Self-contained advisory alert verification */}
      <div className="mt-auto border-t border-zinc-800/80 pt-3 flex items-center gap-2 text-[10px] text-zinc-500">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>WHO Global Air Quality Standard Reference Compliant</span>
      </div>
    </div>
  );
}



