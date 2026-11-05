import React, { useState } from 'react';
import {
  Activity,
  AlertOctagon,
  ArrowRight,
  Clock,
  Layers,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { OverviewData } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { MetricCard } from '../components/MetricCard';
import { api } from '../services/api';

interface OverviewPageProps {
  data: OverviewData | null;
  isLoading: boolean;
  onRefresh: () => void;
  onNavigateToMonitor: (id: string) => void;
  onNavigateToMonitors: () => void;
  onNavigateToIncidents: () => void;
  onOpenAddModal: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  data,
  isLoading,
  onRefresh,
  onNavigateToMonitor,
  onNavigateToMonitors,
  onNavigateToIncidents,
  onOpenAddModal,
}) => {
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const handleCheckNow = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckingId(id);
    try {
      await api.checkNow(id);
      onRefresh();
    } catch (err) {
      console.error('Check failed:', err);
    } finally {
      setCheckingId(null);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
          Loading system overview...
        </div>
      </div>
    );
  }

  const counts = data?.monitors_count || {
    total: 0,
    up: 0,
    degraded: 0,
    down: 0,
    recovered: 0,
    pending: 0,
    paused: 0,
  };

  const hasOutage = counts.down > 0 || (data?.open_incidents_count || 0) > 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner if Active Incidents */}
      {hasOutage && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/20 text-red-400 shrink-0">
              <AlertOctagon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">
                Active Outage Detected ({data?.open_incidents_count} Open Incident{data?.open_incidents_count === 1 ? '' : 's'})
              </h4>
              <p className="text-xs text-red-300 mt-0.5">
                One or more monitored endpoints have failed consecutive health checks.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToIncidents}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition-colors shadow-sm"
          >
            Investigate Incidents
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Monitored Endpoints"
          value={counts.total}
          subtitle={`${counts.up} operational, ${counts.down} down, ${counts.paused} paused`}
          icon={<Layers className="h-4 w-4" />}
        />

        <MetricCard
          title="Estimated Availability"
          value={data?.overall_uptime_percentage ? `${data.overall_uptime_percentage.toFixed(2)}%` : '100%'}
          subtitle={data?.uptime_calculation_note || 'Check-based estimated uptime'}
          icon={<ShieldCheck className="h-4 w-4" />}
        />

        <MetricCard
          title="Average Latency"
          value={data?.average_latency_ms ? `${Math.round(data.average_latency_ms)} ms` : '--'}
          subtitle="Across active endpoint probes"
          icon={<Zap className="h-4 w-4" />}
        />

        <MetricCard
          title="Active Incidents"
          value={data?.open_incidents_count || 0}
          subtitle={counts.down > 0 ? 'Requires attention' : 'All systems operating within SLA'}
          highlight={hasOutage}
          icon={<AlertOctagon className="h-4 w-4" />}
        />
      </div>

      {/* Monitors List / Summary Table */}
      <div className="rounded-xl border border-border bg-surface-100/40 overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border p-5 bg-surface-100/60">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              Monitored Endpoints
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time health status, response times, and estimated uptime availability.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onRefresh}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-100 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-surface-50 hover:text-white transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-sm shadow-emerald-950/40"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Monitor
            </button>
          </div>
        </div>

        {data?.monitors && data.monitors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-surface-200/50 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Name & URL</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4">Avg Latency</th>
                  <th className="py-3 px-4">Interval</th>
                  <th className="py-3 px-4">Last Checked</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-slate-300">
                {data.monitors.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => onNavigateToMonitor(m.id)}
                    className="hover:bg-surface-100/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <StatusBadge
                        status={!m.enabled ? 'PAUSED' : m.current_status}
                        size="sm"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white text-sm">{m.name}</div>
                      <div className="font-mono text-slate-500 text-[11px] truncate max-w-xs sm:max-w-md">
                        {m.url}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium">
                      {m.uptime_percentage !== null ? (
                        <span
                          className={
                            m.uptime_percentage >= 99
                              ? 'text-emerald-400'
                              : m.uptime_percentage >= 95
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }
                        >
                          {m.uptime_percentage.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-500">--</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {m.average_latency_ms !== null ? (
                        <span className="text-slate-200">{Math.round(m.average_latency_ms)} ms</span>
                      ) : (
                        <span className="text-slate-500">--</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {m.interval_seconds}s
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {m.last_checked_at ? (
                        <span title={new Date(m.last_checked_at).toISOString()}>
                          {new Date(m.last_checked_at).toLocaleTimeString()}
                        </span>
                      ) : (
                        <span className="text-slate-500">Pending</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => handleCheckNow(m.id, e)}
                        disabled={checkingId === m.id}
                        title="Run check immediately"
                        className="inline-flex items-center gap-1 rounded border border-border bg-surface-100 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-surface-50 hover:text-white transition-colors disabled:opacity-50"
                      >
                        <Play className={`h-3 w-3 ${checkingId === m.id ? 'animate-spin' : ''}`} />
                        Check Now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-100 text-slate-400">
              <Activity className="h-6 w-6" />
            </div>
            <h4 className="mt-4 text-sm font-semibold text-white">No Monitored Endpoints</h4>
            <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
              You haven't configured any API endpoints yet. Add your first HTTP/HTTPS target to start monitoring.
            </p>
            <button
              onClick={onOpenAddModal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add First Monitor
            </button>
          </div>
        )}
      </div>

      {/* Recent Incidents Timeline */}
      {data?.recent_incidents && data.recent_incidents.length > 0 && (
        <div className="rounded-xl border border-border bg-surface-100/40 p-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              Recent Incidents & Outages
            </h4>
            <button
              onClick={onNavigateToIncidents}
              className="text-xs text-emerald-400 hover:underline font-medium"
            >
              View all incidents &rarr;
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {data.recent_incidents.map((inc) => (
              <div
                key={inc.id}
                onClick={onNavigateToIncidents}
                className="flex items-center justify-between rounded-lg border border-border bg-surface-100/70 p-3 hover:border-slate-700 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      inc.status === 'OPEN' ? 'bg-red-500 animate-ping' : 'bg-slate-500'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-2">
                      <span>{inc.monitor_name || 'Endpoint'}</span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[10px] font-mono uppercase font-bold ${
                          inc.status === 'OPEN'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {inc.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      {inc.reason}
                    </div>
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-500 font-mono">
                  {new Date(inc.started_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
