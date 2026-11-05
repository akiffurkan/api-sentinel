import React from 'react';
import { MonitorStatus } from '../types';

interface StatusBadgeProps {
  status: MonitorStatus | 'PAUSED';
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showPulse = true,
}) => {
  const configs: Record<
    MonitorStatus | 'PAUSED',
    { label: string; bg: string; text: string; dot: string; pulse: string }
  > = {
    UP: {
      label: 'Operational',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400',
      pulse: 'bg-emerald-400/40',
    },
    DEGRADED: {
      label: 'Degraded',
      bg: 'bg-amber-500/10 border-amber-500/30',
      text: 'text-amber-400',
      dot: 'bg-amber-400',
      pulse: 'bg-amber-400/40',
    },
    DOWN: {
      label: 'Down',
      bg: 'bg-red-500/10 border-red-500/30',
      text: 'text-red-400',
      dot: 'bg-red-400',
      pulse: 'bg-red-400/40',
    },
    RECOVERED: {
      label: 'Recovered',
      bg: 'bg-cyan-500/10 border-cyan-500/30',
      text: 'text-cyan-400',
      dot: 'bg-cyan-400',
      pulse: 'bg-cyan-400/40',
    },
    PENDING: {
      label: 'Pending Check',
      bg: 'bg-slate-500/10 border-slate-500/30',
      text: 'text-slate-400',
      dot: 'bg-slate-400',
      pulse: 'bg-slate-400/40',
    },
    PAUSED: {
      label: 'Paused',
      bg: 'bg-zinc-800/60 border-zinc-700/50',
      text: 'text-zinc-400',
      dot: 'bg-zinc-500',
      pulse: 'bg-transparent',
    },
  };

  const current = configs[status] || configs.PENDING;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  }[size];

  const dotSize = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium tracking-wide ${current.bg} ${current.text} ${sizeClasses}`}
    >
      <span className="relative flex items-center justify-center">
        {showPulse && status !== 'PAUSED' && status !== 'PENDING' && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${current.pulse}`}
          />
        )}
        <span className={`relative inline-flex rounded-full ${current.dot} ${dotSize}`} />
      </span>
      <span>{current.label}</span>
    </span>
  );
};
