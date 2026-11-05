import React, { useEffect, useState } from 'react';
import {
  Bell,
  CheckCircle,
  Key,
  RefreshCw,
  Send,
  Shield,
  Sliders,
  XCircle,
} from 'lucide-react';
import { SettingsInfo } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { isAuthRequired } = useAuth();
  const [settings, setSettings] = useState<SettingsInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramResult, setTelegramResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSettingsInfo();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    setTelegramResult(null);
    try {
      const res = await api.testTelegramAlert();
      setTelegramResult(res);
    } catch (err: any) {
      setTelegramResult({
        success: false,
        message: err.message || 'Failed to dispatch test notification.',
      });
    } finally {
      setTestingTelegram(false);
    }
  };

  if (isLoading && !settings) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">System Settings & Integrations</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure incident notification channels, inspect operational parameters, and verify security policies.
        </p>
      </div>

      {/* Telegram Outage Alerts Card */}
      <div className="rounded-xl border border-border bg-surface-100/60 p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Telegram Notifications</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Instant outage alerts when endpoints fail and recovery notifications when resolved.
              </p>
            </div>
          </div>

          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${
              settings?.telegram.configured
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
            }`}
          >
            {settings?.telegram.configured ? 'Active' : 'Unconfigured'}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="rounded-lg border border-border bg-surface-200/50 p-3">
            <span className="text-slate-500 block">Bot Token</span>
            <span className="font-mono text-slate-300 mt-1 block">
              {settings?.telegram.bot_token || 'Not Configured'}
            </span>
          </div>

          <div className="rounded-lg border border-border bg-surface-200/50 p-3">
            <span className="text-slate-500 block">Target Chat ID</span>
            <span className="font-mono text-slate-300 mt-1 block">
              {settings?.telegram.chat_id || 'Not Configured'}
            </span>
          </div>
        </div>

        {telegramResult && (
          <div
            className={`mt-4 rounded-lg border p-3 text-xs flex items-center gap-2.5 ${
              telegramResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {telegramResult.success ? (
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 text-red-400" />
            )}
            <div>{telegramResult.message}</div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs text-slate-500">
            Configure with <code>TELEGRAM_BOT_TOKEN</code> & <code>TELEGRAM_CHAT_ID</code> in <code>.env</code>
          </span>

          <button
            onClick={handleTestTelegram}
            disabled={testingTelegram || !settings?.telegram.configured}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-200 px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-surface-50 hover:text-white disabled:opacity-40 transition-colors"
          >
            <Send className={`h-3.5 w-3.5 ${testingTelegram ? 'animate-spin' : ''}`} />
            {testingTelegram ? 'Sending Test...' : 'Send Test Notification'}
          </button>
        </div>
      </div>

      {/* Security & SSRF Policy */}
      <div className="rounded-xl border border-border bg-surface-100/60 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">SSRF & Network Security Policy</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Enforced on every HTTP request and redirect target to protect infrastructure.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="rounded-lg border border-border bg-surface-200/50 p-3">
            <span className="text-slate-500 block">Allowed Ports</span>
            <span className="font-mono text-emerald-400 font-semibold mt-1 block">
              {settings?.security.allowed_ports.join(', ')}
            </span>
          </div>

          <div className="rounded-lg border border-border bg-surface-200/50 p-3">
            <span className="text-slate-500 block">Max Redirects</span>
            <span className="font-mono text-slate-200 font-semibold mt-1 block">
              {settings?.security.max_redirects} (Re-validated hops)
            </span>
          </div>

          <div className="rounded-lg border border-border bg-surface-200/50 p-3">
            <span className="text-slate-500 block">Max Response Size</span>
            <span className="font-mono text-slate-200 font-semibold mt-1 block">
              {(settings?.security.max_response_bytes || 1048576) / (1024 * 1024)} MB (Capped)
            </span>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-slate-500 leading-relaxed">
          Security policy automatically rejects requests targeting loopback addresses (127.0.0.1, ::1),
          RFC1918 private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), carrier-grade NAT,
          link-local addresses (169.254.0.0/16), and cloud metadata services.
        </p>
      </div>

      {/* Monitoring Engine Config */}
      <div className="rounded-xl border border-border bg-surface-100/60 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Monitoring Engine Defaults</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Scheduling loop parameters and concurrency boundaries.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="rounded-lg border border-border bg-surface-200/50 p-3">
            <span className="text-slate-500 block text-[11px] font-sans">Default Interval</span>
            <span className="text-slate-200 font-semibold mt-1 block">
              {settings?.engine.default_interval}s
            </span>
          </div>

          <div className="rounded-lg border border-border bg-surface-200/50 p-3">
            <span className="text-slate-500 block text-[11px] font-sans">Default Timeout</span>
            <span className="text-slate-200 font-semibold mt-1 block">
              {settings?.engine.default_timeout}s
            </span>
          </div>

          <div className="rounded-lg border border-border bg-surface-200/50 p-3">
            <span className="text-slate-500 block text-[11px] font-sans">Max Concurrency</span>
            <span className="text-emerald-400 font-semibold mt-1 block">
              {settings?.engine.max_concurrent_checks} Probes
            </span>
          </div>

          <div className="rounded-lg border border-border bg-surface-200/50 p-3">
            <span className="text-slate-500 block text-[11px] font-sans">Worker Poll Loop</span>
            <span className="text-slate-200 font-semibold mt-1 block">
              {settings?.engine.worker_poll_interval}s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
