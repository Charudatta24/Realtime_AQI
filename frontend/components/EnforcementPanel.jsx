'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Navigation, CheckCircle2, ShieldAlert, Sparkles, Send, Loader2 } from 'lucide-react';


export default function EnforcementPanel({ city, onDispatchSuccess }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [dispatchingId, setDispatchingId] = useState(null);
  const [inspectorName, setInspectorName] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');

  // Self-fetch enforcement recommendations when city changes
  useEffect(() => {
    if (!city) return;
    setLoadingRecs(true);
    fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/metrics/enforcement?city=${city}`)
      .then(r => r.json())
      .then(d => setRecommendations(d.recommendations || []))
      .catch(e => console.error('Enforcement fetch error:', e))
      .finally(() => setLoadingRecs(false));
  }, [city]);

  // Default inspector values based on city selection
  const getDefaultInspector = () => {
    if (city === 'Delhi') return 'Officer Amit Sharma (DPCC)';
    if (city === 'Mumbai') return 'Officer Rohan Patil (MPCB)';
    if (city === 'Bengaluru') return 'Officer K. Gowda (KSPCB)';
    if (city === 'Chennai') return 'Officer S. Kumar (TNPCB)';
    return 'Officer Subrata Roy (WBPCB)';
  };

  const handleOpenDispatch = (recId) => {
    setDispatchingId(recId);
    setInspectorName(getDefaultInspector());
    setVehiclePlate(`DL-1C-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleConfirmDispatch = async (e) => {
    e.preventDefault();
    if (!inspectorName || !vehiclePlate) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recommendation_id: dispatchingId,
          inspector_name: inspectorName,
          vehicle_plate: vehiclePlate
        })
      });

      const result = await res.json();
      if (result.status === 'Success') {
        onDispatchSuccess(dispatchingId, {
          inspector: inspectorName,
          vehicle: vehiclePlate,
          dispatched_at: new Date().toISOString()
        });
        setDispatchingId(null);
      }
    } catch (err) {
      console.error("Error dispatching inspector:", err);
    }
  };

  const getPriorityClass = (priority) => {
    if (priority === 'Critical') return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (priority === 'High') return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 shadow-lg backdrop-blur-sm flex flex-col h-[550px] relative">
      <div className="border-b border-zinc-800 pb-3 mb-4">
        <h3 className="font-semibold text-zinc-100 flex items-center gap-1.5 text-sm">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Enforcement Intelligence Center
        </h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          AI prioritized municipal inspections & emission control actions.
        </p>
      </div>

      {/* Recommendations List Container */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {loadingRecs ? (
          <div className="h-full flex items-center justify-center gap-2 text-zinc-500 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            Fetching enforcement intelligence…
          </div>
        ) : recommendations.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center p-6 text-zinc-500 text-xs">
            No enforcement alerts triggered. Air quality levels are currently within satisfactory guidelines.
          </div>
        ) : (
          recommendations.map((rec) => (
            <div 
              key={rec.id} 
              className={`p-3.5 rounded-lg border bg-zinc-950/60 transition-all duration-200 ${
                rec.status === 'Dispatched' 
                  ? 'border-blue-900/40 shadow-md shadow-blue-950/20' 
                  : 'border-zinc-800/80 hover:border-zinc-700/60'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityClass(rec.priority)}`}>
                    {rec.priority}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Cell ({rec.row}, {rec.col})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-zinc-400">AQI {rec.aqi}</span>
                </div>
              </div>

              <h4 className="text-xs font-semibold text-zinc-200 mt-2">{rec.action}</h4>
              <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed bg-zinc-900/30 p-2 rounded border border-zinc-800/20">
                <strong>Evidence</strong>: {rec.evidence}
              </p>

              <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-zinc-800/50 text-[10px]">
                <div className="flex gap-3 text-zinc-500">
                  <span>Source: <strong className="text-zinc-400">{rec.primary_source}</strong></span>
                  <span>ETA: <strong className="text-zinc-400">{rec.eta}</strong></span>
                </div>
                
                {rec.status === 'Dispatched' ? (
                  <div className="flex items-center gap-1 text-blue-400 font-semibold bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    Enforcer Dispatched
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenDispatch(rec.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded border border-zinc-700/50 hover:border-zinc-600 transition-colors font-medium cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    Dispatch Team
                  </button>
                )}
              </div>

              {/* Inspector details overlay inside the item card if dispatched */}
              {rec.status === 'Dispatched' && rec.dispatch_details && (
                <div className="mt-2.5 bg-blue-950/20 border border-blue-900/20 p-2 rounded text-[9px] text-blue-300 flex justify-between">
                  <span>Enforcer: <strong>{rec.dispatch_details.inspector}</strong></span>
                  <span>Vehicle: <strong>{rec.dispatch_details.vehicle}</strong></span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Custom Modal for Dispatch Inputs (Floating glass card) */}
      {dispatchingId && (
        <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm rounded-xl flex items-center justify-center p-6 z-[2000]">
          <form onSubmit={handleConfirmDispatch} className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl w-full max-w-sm space-y-4">
            <h4 className="font-semibold text-zinc-100 flex items-center gap-1.5 text-sm">
              <Navigation className="w-4 h-4 text-blue-400 animate-pulse" />
              Inspector Dispatch Protocol
            </h4>
            <p className="text-[10px] text-zinc-400">
              Verify and assign field inspectors for source enforcement deployment.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-zinc-500 block mb-1">Inspector / Team Name</label>
                <input 
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-zinc-700"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 block mb-1">Vehicle License Plate</label>
                <input 
                  type="text"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-zinc-700"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-zinc-800">
              <button 
                type="button"
                onClick={() => setDispatchingId(null)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold cursor-pointer flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                Confirm & Send
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
