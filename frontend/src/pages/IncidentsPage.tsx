import React, { useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { Incident } from '../types';

interface IncidentsPageProps {
  incidents: Incident[];
  isLoading: boolean;
  onRefresh: () => void;
  onNavigateToMonitor: (id: string) => void;
}

export const IncidentsPage: React.FC<IncidentsPageProps> = ({
  incidents,
  isLoading,
  onRefresh,
  onNavigateToMonitor,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  const [search, setSearch] = useState('');

  const filteredIncidents = incidents.filter((inc) => {
    const matchesFilter =
      filter === 'ALL' || inc.status === filter;

    const matchesSearch =
      (inc.monitor_name || '').toLowerCase().includes(search.toLowerCase()) ||
      inc.reason.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const openCount = incidents.filter((i) => i.status === 'OPEN').length;
  const resolvedCount = incidents.filter((i) => i.status === 'RESOLVED').length;

  const formatDuration = (seconds: number | null): string => {
    if (seconds === null || seconds === undefined) return 'Ongoing';
    const s = Math.round(seconds);
    if (s < 60) return `${s}s`;
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    if (mins < 60) return `${mins}m ${rem}s`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Incident Management</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Log of detected outages, root failure reasons, recovery durations, and alerts.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-100 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-surface-50 hover:text-white transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter tabs and search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-border bg-surface-100/50 p-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search incident reason or monitor..."
            className="w-full rounded-lg border border-border bg-surface-200 py-1.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1 w-full sm:w-auto">
          <button
            onClick={() => setFilter('ALL')}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              filter === 'ALL'
                ? 'bg-surface-50 text-white border border-border'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({incidents.length})
          </button>
          <button
            onClick={() => setFilter('OPEN')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              filter === 'OPEN'
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Open ({openCount})
          </button>
          <button
            onClick={() => setFilter('RESOLVED')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              filter === 'RESOLVED'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Resolved ({resolvedCount})
          </button>
        </div>
      </div>

      {/* Incidents Table */}
      {filteredIncidents.length > 0 ? (
        <div className="rounded-xl border border-border bg-surface-100/40 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-surface-200/50 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Monitor</th>
                  <th className="py-3 px-4">Failure Reason</th>
                  <th className="py-3 px-4">Started At</th>
                  <th className="py-3 px-4">Resolved At</th>
                  <th className="py-3 px-4 text-right">Outage Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-slate-300">
                {filteredIncidents.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => onNavigateToMonitor(inc.monitor_id)}
                    className="hover:bg-surface-100/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      {inc.status === 'OPEN' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                          OPEN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          RESOLVED
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white text-xs">{inc.monitor_name || 'Monitor'}</div>
                      {inc.monitor_url && (
                        <div className="text-[11px] font-mono text-slate-500 truncate max-w-xs">
                          {inc.monitor_url}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-red-300">
                      <div className="truncate max-w-md">{inc.reason}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">
                      {new Date(inc.started_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">
                      {inc.resolved_at ? new Date(inc.resolved_at).toLocaleString() : '--'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium">
                      <span
                        className={inc.status === 'OPEN' ? 'text-red-400 font-bold' : 'text-slate-300'}
                      >
                        {formatDuration(inc.duration_seconds)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-12 text-center bg-surface-100/20">
          <ShieldAlert className="mx-auto h-8 w-8 text-slate-500" />
          <h4 className="mt-3 text-sm font-semibold text-white">No Incidents Found</h4>
          <p className="mt-1 text-xs text-slate-400">
            {filter === 'OPEN'
              ? 'Great news! There are currently no active open incidents.'
              : 'No incidents match your search criteria.'}
          </p>
        </div>
      )}
    </div>
  );
};
