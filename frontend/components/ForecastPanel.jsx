'use client';

import { useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingUp, Activity, CheckCircle2 } from 'lucide-react';
import { getAqiColor } from '../utils/aqi';

export default function ForecastPanel({ city, selectedCell, currentAqi, timestamp }) {
  const [forecastTrends, setForecastTrends] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedCell) return;

    const fetchForecasts = async () => {
      setLoading(true);
      try {
        const timeParam = timestamp ? `&time=${timestamp}` : '';
        
        // Fetch 24, 48, 72 hours forecast in parallel
        const [res24, res48, res72] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'https://realtime-aqi-1u9g.onrender.com'}/api/metrics/forecast?city=${city}&hours=24${timeParam}`),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'https://realtime-aqi-1u9g.onrender.com'}/api/metrics/forecast?city=${city}&hours=48${timeParam}`),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'https://realtime-aqi-1u9g.onrender.com'}/api/metrics/forecast?city=${city}&hours=72${timeParam}`)
        ]);

        const data24 = await res24.json();
        const data48 = await res48.json();
        const data72 = await res72.json();

        const r = selectedCell.row;
        const c = selectedCell.col;

        const trends = [
          { name: 'Current', aqi: currentAqi, time: 'Now' },
          { name: '+24h Forecast', aqi: data24.grid_aqi[r][c], time: '24h' },
          { name: '+48h Forecast', aqi: data48.grid_aqi[r][c], time: '48h' },
          { name: '+72h Forecast', aqi: data72.grid_aqi[r][c], time: '72h' }
        ];

        setForecastTrends(trends);
        // Take performance metrics from 24h forecast model as reference
        setPerformance(data24.performance);
      } catch (err) {
        console.error("Error fetching forecasts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchForecasts();
  }, [city, selectedCell, currentAqi, timestamp]);

  if (!selectedCell) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 h-[320px] flex flex-col items-center justify-center text-center">
        <Activity className="w-10 h-10 text-zinc-600 mb-2" />
        <p className="text-zinc-400 font-medium">Predictive Forecasts</p>
        <p className="text-xs text-zinc-500 max-w-xs mt-1">Select a grid cell to trigger atmospheric dispersion ML forecasts for the next 24-72 hours.</p>
      </div>
    );
  }

  if (loading || forecastTrends.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 h-[320px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-emerald-500 border-zinc-700 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-zinc-400">Running random forest regressor forecasting model...</p>
        </div>
      </div>
    );
  }

  const latestForecastAqi = forecastTrends[3]?.aqi;
  const forecastColor = getAqiColor(latestForecastAqi);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 shadow-lg backdrop-blur-sm flex flex-col h-[380px]">
      <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
        <div>
          <h3 className="font-semibold text-zinc-100 flex items-center gap-1.5 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Hyperlocal AQI Forecasting (1km)
          </h3>
          <p className="text-[10px] text-zinc-500 uppercase mt-0.5 font-semibold">
            Predictive Trend for cell ({selectedCell.row}, {selectedCell.col})
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-zinc-500 block">72h Peak Prediction</span>
          <span className="text-sm font-bold" style={{ color: forecastColor }}>{latestForecastAqi} AQI</span>
        </div>
      </div>

      {/* Recharts Area Chart */}
      <div className="flex-1 min-h-0 w-full pt-4">
        <ResponsiveContainer width="100%" height="90%">
          <AreaChart data={forecastTrends} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
            <defs>
              <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
            <XAxis dataKey="time" stroke="#71717a" fontSize={10} tickLine={false} />
            <YAxis stroke="#71717a" fontSize={10} domain={[0, 450]} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
              labelStyle={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 'bold' }}
              itemStyle={{ color: '#10b981', fontSize: '12px' }}
            />
            <Area type="monotone" dataKey="aqi" name="Predicted AQI" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAqi)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Model validation performance block */}
      {performance && (
        <div className="border-t border-zinc-800/80 pt-3 flex flex-col gap-1.5 mt-auto">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-zinc-500 font-semibold uppercase flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              Forecast Validation Metrics
            </span>
            <span className="text-emerald-400 font-semibold">
              +{performance.error_reduction_pct}% Over Persistence
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/60">
            <div className="flex justify-between">
              <span className="text-zinc-500">AI Model RMSE:</span>
              <span className="font-bold text-zinc-300">{performance.model_rmse}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Baseline RMSE:</span>
              <span className="font-bold text-zinc-400">{performance.persistence_rmse}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


