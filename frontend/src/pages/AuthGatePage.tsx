import React, { useState } from 'react';
import { Key, Lock, AlertCircle, Languages } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';

export const AuthGatePage: React.FC = () => {
  const { login, authError, isLoading } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const [tokenInput, setTokenInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!tokenInput.trim()) {
      setLocalError(t.auth.enterToken);
      return;
    }

    const success = await login(tokenInput);
    if (!success) {
      setLocalError(t.auth.invalidToken);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 relative">
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 rounded-md border border-border bg-surface-100 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <Languages className="h-4 w-4 text-emerald-400" />
          <span className="font-mono uppercase">{language}</span>
          <span className="text-[10px] text-slate-500">|</span>
          <span className="text-xs text-slate-400">{language === 'en' ? '🇹🇷 TR' : '🇬🇧 EN'}</span>
        </button>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-border bg-surface-100 p-8 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <svg viewBox="0 0 48 48" className="h-6 w-6 fill-none" stroke="currentColor">
              <path
                d="M24 4L7 11V22C7 32.5 14.2 42.1 24 44C33.8 42.1 41 32.5 41 22V11L24 4Z"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 24H18L21 17L27 31L30 24H34"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight text-white">{t.brand}</h2>
          <p className="mt-1 text-xs text-slate-400">
            {t.auth.title}
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
              {t.auth.tokenLabel}
            </label>
            <div className="relative mt-1.5">
              <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder={t.auth.tokenPlaceholder}
                className="w-full rounded-lg border border-border bg-surface-200 py-2 pl-9 pr-3 text-xs text-white font-mono placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500 leading-normal">
              {t.auth.tokenHelp}
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-sm shadow-emerald-950/40"
          >
            <Lock className="h-3.5 w-3.5" />
            {isLoading ? t.auth.verifying : t.auth.authenticate}
          </button>
        </form>
      </div>
    </div>
  );
};
