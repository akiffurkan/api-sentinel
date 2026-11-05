import React, { useState } from 'react';
import { Key, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthGatePage: React.FC = () => {
  const { login, authError, isLoading } = useAuth();
  const [tokenInput, setTokenInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!tokenInput.trim()) {
      setLocalError('Please enter the administrative token.');
      return;
    }

    const success = await login(tokenInput);
    if (!success) {
      setLocalError('Invalid administrative token. Check the ADMIN_TOKEN in your .env configuration.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface-100 p-8 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight text-white">API Sentinel</h2>
          <p className="mt-1 text-xs text-slate-400">
            Single-Admin Dashboard Authentication
          </p>
        </div>

        {(localError || authError) && (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>{localError || authError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300">
              Admin Bearer Token
            </label>
            <div className="relative mt-1.5">
              <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste your ADMIN_TOKEN..."
                className="w-full rounded-lg border border-border bg-surface-200 py-2 pl-9 pr-3 text-xs text-white font-mono placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500 leading-normal">
              Authentication token configured via the <code>ADMIN_TOKEN</code> environment variable on your self-hosted server.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-sm shadow-emerald-950/40"
          >
            <Lock className="h-3.5 w-3.5" />
            {isLoading ? 'Verifying...' : 'Authenticate Admin Session'}
          </button>
        </form>
      </div>
    </div>
  );
};
