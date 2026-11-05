import React from 'react';
import { Activity, AlertTriangle, Settings as SettingsIcon, LogOut, Radio, Languages } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';

interface NavbarProps {
  activeTab: 'overview' | 'monitors' | 'incidents' | 'settings';
  setActiveTab: (tab: 'overview' | 'monitors' | 'incidents' | 'settings') => void;
  openIncidentsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openIncidentsCount,
}) => {
  const { isAuthRequired, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface-200/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo and Brand */}
        <div className="flex items-center gap-6">
          <div
            onClick={() => setActiveTab('overview')}
            className="flex cursor-pointer items-center gap-3 transition-opacity hover:opacity-90"
          >
            {/* Custom Sentinel Shield SVG Logo */}
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/10">
              <svg viewBox="0 0 48 48" className="h-5 w-5 fill-none" stroke="currentColor">
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
            <div>
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                {t.brand}
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400 font-semibold border border-emerald-500/20">
                  v1.0.1
                </span>
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-surface-50 text-white'
                  : 'text-slate-400 hover:bg-surface-100 hover:text-slate-200'
              }`}
            >
              <Activity className="h-4 w-4" />
              {t.nav.overview}
            </button>

            <button
              onClick={() => setActiveTab('monitors')}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === 'monitors'
                  ? 'bg-surface-50 text-white'
                  : 'text-slate-400 hover:bg-surface-100 hover:text-slate-200'
              }`}
            >
              <Radio className="h-4 w-4" />
              {t.nav.monitors}
            </button>

            <button
              onClick={() => setActiveTab('incidents')}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === 'incidents'
                  ? 'bg-surface-50 text-white'
                  : 'text-slate-400 hover:bg-surface-100 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              {t.nav.incidents}
              {openIncidentsCount > 0 && (
                <span className="ml-1 rounded-full bg-red-500/20 border border-red-500/40 px-1.5 py-0.2 text-[11px] font-mono font-bold text-red-400">
                  {openIncidentsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-surface-50 text-white'
                  : 'text-slate-400 hover:bg-surface-100 hover:text-slate-200'
              }`}
            >
              <SettingsIcon className="h-4 w-4" />
              {t.nav.settings}
            </button>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            title={language === 'en' ? 'Türkçe diline geç' : 'Switch to English'}
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface-100 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:bg-surface-50 hover:text-white transition-all shadow-sm"
          >
            <Languages className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-mono uppercase tracking-wider">{language}</span>
            <span className="text-[10px] text-slate-500">|</span>
            <span className="text-[11px] text-slate-400">{language === 'en' ? '🇹🇷 TR' : '🇬🇧 EN'}</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-surface-100/80 px-2.5 py-1 rounded-md border border-border">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t.nav.workerActive}</span>
          </div>

          {isAuthRequired && (
            <button
              onClick={logout}
              title={t.nav.logout}
              className="flex items-center gap-1.5 rounded-md border border-border bg-surface-100 px-2.5 py-1 text-xs font-medium text-slate-400 hover:border-slate-700 hover:text-white transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.nav.logout}</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="flex md:hidden border-t border-border px-4 py-2 gap-1 overflow-x-auto bg-surface-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium ${
            activeTab === 'overview' ? 'bg-surface-50 text-white' : 'text-slate-400'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          {t.nav.overview}
        </button>
        <button
          onClick={() => setActiveTab('monitors')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium ${
            activeTab === 'monitors' ? 'bg-surface-50 text-white' : 'text-slate-400'
          }`}
        >
          <Radio className="h-3.5 w-3.5" />
          {t.nav.monitors}
        </button>
        <button
          onClick={() => setActiveTab('incidents')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium ${
            activeTab === 'incidents' ? 'bg-surface-50 text-white' : 'text-slate-400'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {t.nav.incidents}
          {openIncidentsCount > 0 && (
            <span className="rounded-full bg-red-500/20 px-1 text-[10px] text-red-400">
              {openIncidentsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium ${
            activeTab === 'settings' ? 'bg-surface-50 text-white' : 'text-slate-400'
          }`}
        >
          <SettingsIcon className="h-3.5 w-3.5" />
          {t.nav.settings}
        </button>
      </div>
    </header>
  );
};
