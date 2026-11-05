import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Clock,
  Edit2,
  ExternalLink,
  History,
  Layers,
  Play,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Zap,
} from 'lucide-react';
import { CheckResult, MonitorDetail } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { MetricCard } from '../components/MetricCard';
import { LatencyChart } from '../components/LatencyChart';
import { EditMonitorModal } from '../components/EditMonitorModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { api } from '../services/api';

interface MonitorDetailPageProps {
  monitorId: string;
  onBack: () => void;
  onMonitorDeleted: () => void;
}

export const MonitorDetailPage: React.FC<MonitorDetailPageProps> = ({
  monitorId,
  onBack,
  onMonitorDeleted,
}) => {
  const [monitor, setMonitor] = useState<MonitorDetail | null>(null);
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingNow, setIsCheckingNow] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDetail = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMonitor(monitorId);
      setMonitor(data);
      setChecks(data.recent_checks || []);
    } catch (err) {
      console.error('Failed to load monitor detail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [monitorId]);

  const handleCheckNow = async () => {
    setIsCheckingNow(true);
    try {
      await api.checkNow(monitorId);
      await fetchDetail();
    } catch (err) {
      console.error('Check failed:', err);
    } finally {
      setIsCheckingNow(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await api.deleteMonitor(monitorId);
      setIsDeleteOpen(false);
      onMonitorDeleted();
    } catch (err) {
      console.error('Failed to delete monitor:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading && !monitor) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
          Loading monitor details...
        </div>
      </div>
    );
  }

  if (!monitor) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-400">Monitor not found or deleted.</p>
        <button
          onClick={onBack}
          className="mt-4 rounded-lg bg-surface-100 px-4 py-2 text-xs text-white hover:bg-surface-50"
        >
          Back to monitors
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and Quick Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg border border-border bg-surface-100 p-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-white tracking-tight">{monitor.name}</h2>
              <StatusBadge
                status={!monitor.enabled ? 'PAUSED' : monitor.current_status}
                size="md"
              />
            </div>
            <div className="mt-1 flex items-center gap-2 font-mono text-xs text-slate-400">
              <span>{monitor.url}</span>
              <a
                href={monitor.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-slate-500 hover:text-slate-300"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCheckNow}
            disabled={isCheckingNow}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-100 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-surface-50 hover:text-white disabled:opacity-50 transition-colors"
          >
            <Play className={`h-3.5 w-3.5 ${isCheckingNow ? 'animate-spin' : ''}`} />
            Check Now
          </button>

          <button
            onClick={() => setIsEditOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-100 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-surface-50 hover:text-white transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </button>

          <button
            onClick={() => setIsDeleteOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-100 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Active Incident Warning if any */}
      {monitor.active_incident && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-red-500/20 p-2 text-red-400 shrink-0 mt-0.5">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-red-400 uppercase">
                  OPEN INCIDENT
                </span>
                <span className="text-xs text-slate-400">
                  Started {new Date(monitor.active_incident.started_at).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-white">
                Outage Reason: {monitor.active_incident.reason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="24h Estimated Availability"
          value={monitor.uptime_percentage !== null ? `${monitor.uptime_percentage.toFixed(2)}%` : '100%'}
          subtitle="Check-based estimated availability"
          icon={<Clock className="h-4 w-4" />}
        />

        <MetricCard
          title="Average Latency"
          value={monitor.average_latency_ms !== null ? `${Math.round(monitor.average_latency_ms)} ms` : '--'}
          subtitle={`Min: ${monitor.min_latency_ms || 0}ms · Max: ${monitor.max_latency_ms || 0}ms`}
          icon={<Zap className="h-4 w-4" />}
        />

        <MetricCard
          title="p95 Latency"
          value={monitor.p95_latency_ms !== null ? `${Math.round(monitor.p95_latency_ms)} ms` : '--'}
          subtitle="95th percentile response time"
          icon={<Zap className="h-4 w-4" />}
        />

        <MetricCard
          title="Total Recorded Checks"
          value={monitor.total_checks_count}
          subtitle={`Checking every ${monitor.interval_seconds}s`}
          icon={<Layers className="h-4 w-4" />}
        />
      </div>

      {/* Latency History Chart */}
      <div className="rounded-xl border border-border bg-surface-100/40 p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Response Time History</h3>
        <LatencyChart checks={checks} height={260} />
      </div>

      {/* Lower Section: Incident Timeline & Historical Checks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Incident Timeline */}
        <div className="rounded-xl border border-border bg-surface-100/40 p-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <ShieldAlert className="h-4 w-4 text-slate-400" />
            Incident Timeline
          </h3>

          {monitor.recent_incidents && monitor.recent_incidents.length > 0 ? (
            <div className="space-y-3">
              {monitor.recent_incidents.map((inc) => (
                <div
                  key={inc.id}
                  className="rounded-lg border border-border bg-surface-200/60 p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono font-bold uppercase ${
                        inc.status === 'OPEN' ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {inc.status}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {inc.duration_seconds
                        ? `Duration: ${Math.round(inc.duration_seconds)}s`
                        : 'Ongoing Outage'}
                    </span>
                  </div>
                  <div className="mt-1 text-slate-300">{inc.reason}</div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Started: {new Date(inc.started_at).toLocaleString()}
                    {inc.resolved_at && ` · Resolved: ${new Date(inc.resolved_at).toLocaleString()}`}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              No incident history recorded for this monitor.
            </div>
          )}
        </div>

        {/* Recent Check Logs */}
        <div className="rounded-xl border border-border bg-surface-100/40 p-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <History className="h-4 w-4 text-slate-400" />
            Recent Probes Log
          </h3>

          {checks.length > 0 ? (
            <div className="divide-y divide-border overflow-y-auto max-h-72">
              {checks.slice(0, 20).map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        c.success ? 'bg-emerald-400' : 'bg-red-400'
                      }`}
                    />
                    <span className="font-mono text-slate-300">
                      {c.status_code ? `HTTP ${c.status_code}` : 'Error'}
                    </span>
                    {c.error_message && (
                      <span className="text-red-400 text-[11px] truncate max-w-xs">
                        {c.error_message}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
                    <span className="text-emerald-400">{Math.round(c.latency_ms)} ms</span>
                    <span>{new Date(c.checked_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              No check logs available.
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <EditMonitorModal
          monitor={monitor}
          isOpen={true}
          onClose={() => setIsEditOpen(false)}
          onMonitorUpdated={fetchDetail}
        />
      )}

      {/* Delete Confirmation */}
      {isDeleteOpen && (
        <ConfirmationModal
          isOpen={true}
          title={`Delete "${monitor.name}"?`}
          message="Are you sure you want to delete this monitor? All check history and incidents will be erased."
          confirmLabel="Delete Monitor"
          isProcessing={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setIsDeleteOpen(false)}
        />
      )}
    </div>
  );
};
