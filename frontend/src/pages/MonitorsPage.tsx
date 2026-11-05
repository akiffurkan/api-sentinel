import React, { useState } from 'react';
import {
  Activity,
  Edit2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { Monitor } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { EditMonitorModal } from '../components/EditMonitorModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../services/api';

interface MonitorsPageProps {
  monitors: Monitor[];
  isLoading: boolean;
  onRefresh: () => void;
  onNavigateToMonitor: (id: string) => void;
  onOpenAddModal: () => void;
}

export const MonitorsPage: React.FC<MonitorsPageProps> = ({
  monitors,
  isLoading,
  onRefresh,
  onNavigateToMonitor,
  onOpenAddModal,
}) => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null);
  const [deletingMonitor, setDeletingMonitor] = useState<Monitor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const filteredMonitors = monitors.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.url.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PAUSED') return !m.enabled;
    if (statusFilter === 'UP') return m.enabled && (m.current_status === 'UP' || m.current_status === 'RECOVERED');
    if (statusFilter === 'DOWN') return m.enabled && m.current_status === 'DOWN';
    if (statusFilter === 'DEGRADED') return m.enabled && m.current_status === 'DEGRADED';
    return true;
  });

  const handleToggleEnabled = async (m: Monitor, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.updateMonitor(m.id, { enabled: !m.enabled });
      onRefresh();
    } catch (err) {
      console.error('Failed to toggle monitor state:', err);
    }
  };

  const handleCheckNow = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckingId(id);
    try {
      await api.checkNow(id);
      onRefresh();
    } catch (err) {
      console.error('Check now failed:', err);
    } finally {
      setCheckingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMonitor) return;
    setIsDeleting(true);
    try {
      await api.deleteMonitor(deletingMonitor.id);
      setDeletingMonitor(null);
      onRefresh();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filterOptions = [
    { key: 'ALL', label: t.monitors.filterAll },
    { key: 'UP', label: t.monitors.filterUp },
    { key: 'DEGRADED', label: t.monitors.filterDegraded },
    { key: 'DOWN', label: t.monitors.filterDown },
    { key: 'PAUSED', label: t.monitors.filterPaused },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">{t.monitors.title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t.monitors.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-100 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-surface-50 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {t.monitors.refresh}
          </button>
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-sm shadow-emerald-950/40"
          >
            <Plus className="h-4 w-4" />
            {t.monitors.addMonitor}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-border bg-surface-100/50 p-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.monitors.searchPlaceholder}
            className="w-full rounded-lg border border-border bg-surface-200 py-1.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {filterOptions.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === key
                  ? 'bg-surface-50 text-white border border-border'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Monitors Grid / Table */}
      {filteredMonitors.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredMonitors.map((m) => (
            <div
              key={m.id}
              onClick={() => onNavigateToMonitor(m.id)}
              className="flex flex-col md:flex-row items-start md:items-center justify-between rounded-xl border border-border bg-surface-100/60 p-5 hover:border-slate-700/80 cursor-pointer transition-all shadow-sm"
            >
              {/* Left Column: Status & URL Info */}
              <div className="flex items-start gap-4">
                <div className="pt-0.5">
                  <StatusBadge
                    status={!m.enabled ? 'PAUSED' : m.current_status}
                    size="md"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    {m.name}
                    {!m.enabled && (
                      <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[10px] font-mono text-zinc-400">
                        {t.monitors.monitoringSuspended}
                      </span>
                    )}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 font-mono text-xs text-slate-400 break-all">
                    <span>{m.url}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    <span>{t.monitors.colInterval}: {m.interval_seconds}s</span>
                    <span>&bull;</span>
                    <span>{t.detail.timeout}: {m.timeout_seconds}s</span>
                    <span>&bull;</span>
                    <span>{t.detail.expectedStatus}: [{m.expected_status_codes.join(', ')}]</span>
                    {m.last_checked_at && (
                      <>
                        <span>&bull;</span>
                        <span>{t.monitors.colLastChecked} {new Date(m.last_checked_at).toLocaleTimeString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Metrics & Actions */}
              <div className="mt-4 md:mt-0 flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 border-border pt-3 md:pt-0">
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">{t.monitors.colAvailability}</div>
                    <div className="text-sm font-bold font-mono text-emerald-400">
                      {m.uptime_percentage !== null ? `${m.uptime_percentage.toFixed(1)}%` : '--'}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">{t.monitors.colAvgLatency}</div>
                    <div className="text-sm font-bold font-mono text-slate-200">
                      {m.average_latency_ms !== null ? `${Math.round(m.average_latency_ms)} ms` : '--'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleCheckNow(m.id, e)}
                    disabled={checkingId === m.id}
                    title={t.monitors.checkNow}
                    className="rounded-lg border border-border bg-surface-200 p-2 text-slate-300 hover:border-slate-600 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <Play className={`h-3.5 w-3.5 ${checkingId === m.id ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={(e) => handleToggleEnabled(m, e)}
                    title={m.enabled ? t.monitors.pause : t.monitors.resume}
                    className="rounded-lg border border-border bg-surface-200 p-2 text-slate-300 hover:border-slate-600 hover:text-white transition-colors"
                  >
                    {m.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 text-emerald-400" />}
                  </button>

                  <button
                    onClick={() => setEditingMonitor(m)}
                    title={t.monitors.edit}
                    className="rounded-lg border border-border bg-surface-200 p-2 text-slate-300 hover:border-slate-600 hover:text-white transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => setDeletingMonitor(m)}
                    title={t.monitors.delete}
                    className="rounded-lg border border-border bg-surface-200 p-2 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-12 text-center bg-surface-100/20">
          <Activity className="mx-auto h-8 w-8 text-slate-500" />
          <h4 className="mt-3 text-sm font-semibold text-white">{t.monitors.noMonitors}</h4>
          <p className="mt-1 text-xs text-slate-400">
            {search ? `${t.monitors.noMonitors} "${search}"` : t.monitors.noMonitorsDesc}
          </p>
        </div>
      )}

      {/* Edit Modal */}
      {editingMonitor && (
        <EditMonitorModal
          monitor={editingMonitor}
          isOpen={true}
          onClose={() => setEditingMonitor(null)}
          onMonitorUpdated={onRefresh}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingMonitor && (
        <ConfirmationModal
          isOpen={true}
          title={`${t.monitors.delete} "${deletingMonitor.name}"?`}
          message={t.monitors.deleteConfirm}
          confirmLabel={t.monitors.delete}
          isProcessing={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingMonitor(null)}
        />
      )}
    </div>
  );
};
