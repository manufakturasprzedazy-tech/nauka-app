import { cn } from '@/utils/cn';

interface StreakCounterProps {
  streak: number;
  todayActive: boolean;
}

export function FlameIcon({ active, className }: { active: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 2c.5 3.5-1 5-2.5 6.5C7.5 10.5 6 12.5 6 15a6 6 0 0 0 12 0c0-2-1-3.5-2-5-.6 1-1.4 1.6-2 2 .5-2.5-.5-7-2-10z"
        fill={active ? 'url(#flame-grad)' : '#475569'}
      />
      <path
        d="M12 22a4 4 0 0 1-4-4c0-1.5.8-2.6 1.8-3.6.5.8 1.1 1.2 1.7 1.4-.2-1.2 0-2.8.9-4 .8 2 3.6 3 3.6 6.2a4 4 0 0 1-4 4z"
        fill={active ? '#fef3c7' : '#64748b'}
        opacity={active ? 0.9 : 0.5}
      />
      <defs>
        <linearGradient id="flame-grad" x1="6" y1="2" x2="18" y2="22">
          <stop stopColor="#fbbf24" />
          <stop offset="0.5" stopColor="#f97316" />
          <stop offset="1" stopColor="#ef4444" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function StreakCounter({ streak, todayActive }: StreakCounterProps) {
  const active = streak > 0 && todayActive;
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1.5 border',
        active
          ? 'bg-orange-500/10 border-orange-500/30 shadow-[0_0_16px_rgba(249,115,22,0.25)]'
          : 'bg-white/5 border-slate-400/15',
      )}
    >
      <FlameIcon active={active} className={cn('w-5 h-5', active && 'fire-animate')} />
      <span className={cn('text-base font-bold tnum', active ? 'text-orange-300' : 'text-slate-300')}>
        {streak}
      </span>
    </div>
  );
}
