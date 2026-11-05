import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { CheckResult } from '../types';

interface LatencyChartProps {
  checks: CheckResult[];
  height?: number;
}

export const LatencyChart: React.FC<LatencyChartProps> = ({ checks, height = 240 }) => {
  if (!checks || checks.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface-100/30 text-xs text-slate-500"
      >
        No latency check samples recorded yet.
      </div>
    );
  }

  // Check data is newest first, reverse for chronological chart
  const data = [...checks]
    .reverse()
    .slice(-40)
    .map((c) => {
      const d = new Date(c.checked_at);
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return {
        time: timeStr,
        latency: Math.round(c.latency_ms),
        success: c.success,
        statusCode: c.status_code,
        error: c.error_message,
      };
    });

  const avgLatency =
    data.length > 0
      ? Math.round(data.reduce((sum, item) => sum + item.latency, 0) / data.length)
      : 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="rounded-lg border border-border bg-surface-200 p-2.5 shadow-xl text-xs">
          <div className="font-mono text-slate-400">{p.time}</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-medium text-slate-300">Latency:</span>
            <span className="font-mono font-bold text-emerald-400">{p.latency} ms</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="font-medium text-slate-300">Status:</span>
            <span
              className={`font-mono font-semibold ${
                p.success ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {p.statusCode ? `${p.statusCode}` : 'Error'}
            </span>
          </div>
          {p.error && (
            <div className="mt-1 text-[11px] text-red-400 max-w-xs break-all">
              {p.error}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between pb-2 text-xs text-slate-400">
        <span>Latency Trend (Last 40 checks)</span>
        <span className="font-mono text-emerald-400">Avg: {avgLatency} ms</span>
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              stroke="#475569"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#475569"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              unit="ms"
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={avgLatency}
              stroke="#334155"
              strokeDasharray="3 3"
              label={{ value: 'avg', fill: '#64748b', fontSize: 10, position: 'right' }}
            />
            <Area
              type="monotone"
              dataKey="latency"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#latencyGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
