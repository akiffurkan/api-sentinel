import React, { useState } from 'react';
import { X, ShieldAlert, Plus, Check } from 'lucide-react';
import { CreateMonitorInput } from '../types';
import { api, ApiError } from '../services/api';

interface AddMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMonitorCreated: () => void;
}

export const AddMonitorModal: React.FC<AddMonitorModalProps> = ({
  isOpen,
  onClose,
  onMonitorCreated,
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [interval, setInterval] = useState(60);
  const [timeout, setTimeout] = useState(10);
  const [statusCodesInput, setStatusCodesInput] = useState('200');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Parse status codes
    const codes = statusCodesInput
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    if (codes.length === 0) {
      setError('Please provide at least one valid expected HTTP status code (e.g., 200).');
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('URL must start with http:// or https://');
      return;
    }

    const payload: CreateMonitorInput = {
      name: name.trim(),
      url: url.trim(),
      interval_seconds: Number(interval),
      timeout_seconds: Number(timeout),
      expected_status_codes: codes,
      enabled: true,
    };

    setIsSubmitting(true);
    try {
      await api.createMonitor(payload);
      // Reset form
      setName('');
      setUrl('');
      setInterval(60);
      setTimeout(10);
      setStatusCodesInput('200');
      onMonitorCreated();
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError(err.message || 'Failed to create monitor');
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
            <h3 className="text-lg font-semibold text-white">Create Endpoint Monitor</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Add a target HTTP/HTTPS API endpoint for real-time uptime checks.
            </p>
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
            <label className="block text-xs font-medium text-slate-300">Monitor Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Stripe Webhook Receiver"
              className="mt-1.5 w-full rounded-lg border border-border bg-surface-100 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">Target URL (HTTP / HTTPS)</label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/v1/health"
              className="mt-1.5 w-full rounded-lg border border-border bg-surface-100 px-3 py-2 text-sm text-white font-mono placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Validated against SSRF rules: loopback, local network, and metadata IPs are rejected.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300">Check Interval</label>
              <select
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
                className="mt-1.5 w-full rounded-lg border border-border bg-surface-100 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value={15}>Every 15 seconds</option>
                <option value={30}>Every 30 seconds</option>
                <option value={60}>Every 1 minute</option>
                <option value={120}>Every 2 minutes</option>
                <option value={300}>Every 5 minutes</option>
                <option value={600}>Every 10 minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">Timeout</label>
              <select
                value={timeout}
                onChange={(e) => setTimeout(Number(e.target.value))}
                className="mt-1.5 w-full rounded-lg border border-border bg-surface-100 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value={3}>3 seconds</option>
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">Expected HTTP Status Codes</label>
            <input
              type="text"
              required
              value={statusCodesInput}
              onChange={(e) => setStatusCodesInput(e.target.value)}
              placeholder="200, 204"
              className="mt-1.5 w-full rounded-lg border border-border bg-surface-100 px-3 py-2 text-sm text-white font-mono placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="mt-1 text-[11px] text-slate-500">Comma-separated HTTP status codes considered healthy.</p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-border bg-surface-100 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-surface-50 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-sm shadow-emerald-950/40"
            >
              <Plus className="h-4 w-4" />
              {isSubmitting ? 'Creating...' : 'Create Monitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
