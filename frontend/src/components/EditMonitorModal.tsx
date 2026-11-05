import React, { useState } from 'react';
import { X, ShieldAlert, Check } from 'lucide-react';
import { Monitor, UpdateMonitorInput } from '../types';
import { api, ApiError } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

interface EditMonitorModalProps {
  monitor: Monitor;
  isOpen: boolean;
  onClose: () => void;
  onMonitorUpdated: () => void;
}

export const EditMonitorModal: React.FC<EditMonitorModalProps> = ({
  monitor,
  isOpen,
  onClose,
  onMonitorUpdated,
}) => {
  const { t } = useLanguage();
  const [name, setName] = useState(monitor.name);
  const [url, setUrl] = useState(monitor.url);
  const [interval, setInterval] = useState(monitor.interval_seconds);
  const [timeout, setTimeout] = useState(monitor.timeout_seconds);
  const [statusCodesInput, setStatusCodesInput] = useState(
    monitor.expected_status_codes.join(', ')
  );
  const [enabled, setEnabled] = useState(monitor.enabled);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const codes = statusCodesInput
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    if (codes.length === 0) {
      setError(t.modals.statusCodesError);
      return;
    }

    const payload: UpdateMonitorInput = {
      name: name.trim(),
      url: url.trim(),
      interval_seconds: Number(interval),
      timeout_seconds: Number(timeout),
      expected_status_codes: codes,
      enabled,
    };

    setIsSubmitting(true);
    try {
      await api.updateMonitor(monitor.id, payload);
      onMonitorUpdated();
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError(err.message || 'Failed to update monitor');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-surface-200 shadow-2xl p-6"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{t.modals.editTitle}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{monitor.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-surface-100 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400 flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="break-all">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300">{t.modals.monitorName}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-surface-100 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">{t.modals.targetUrl}</label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-surface-100 px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300">{t.modals.checkInterval}</label>
              <select
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
                className="mt-1.5 w-full rounded-lg border border-border bg-surface-100 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={60}>60s (1m)</option>
                <option value={120}>120s (2m)</option>
                <option value={300}>300s (5m)</option>
                <option value={600}>600s (10m)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">{t.modals.timeoutSeconds}</label>
              <select
                value={timeout}
                onChange={(e) => setTimeout(Number(e.target.value))}
                className="mt-1.5 w-full rounded-lg border border-border bg-surface-100 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value={3}>3s</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={15}>15s</option>
                <option value={30}>30s</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">{t.modals.expectedStatusCodes}</label>
            <input
              type="text"
              required
              value={statusCodesInput}
              onChange={(e) => setStatusCodesInput(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-surface-100 px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="monitor-enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-border bg-surface-100 text-emerald-500 focus:ring-emerald-500"
            />
            <label htmlFor="monitor-enabled" className="text-xs font-medium text-slate-300">
              {t.modals.enabledActive}
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-border bg-surface-100 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-surface-50 hover:text-white transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              <Check className="h-4 w-4" />
              {isSubmitting ? t.common.saving : t.common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
