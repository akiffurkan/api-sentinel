import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  highlight?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  badge,
  highlight = false,
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-5 transition-colors ${
        highlight
          ? 'bg-surface-100/90 border-red-500/40 shadow-sm shadow-red-950/20'
          : 'bg-surface-100/60 border-border hover:border-slate-700/80'
      }`}
    >
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-white font-mono">{value}</span>
        {badge}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-400 font-normal line-clamp-1">{subtitle}</p>
      )}
    </div>
  );
};
