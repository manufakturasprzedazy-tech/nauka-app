import { cn } from '@/utils/cn';

interface StreakCounterProps {
  streak: number;
  todayActive: boolean;
}

export function StreakCounter({ streak, todayActive }: StreakCounterProps) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn('text-3xl', streak > 0 && todayActive && 'fire-animate')}>
        {streak > 0 ? '🔥' : '❄️'}
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{streak}</div>
        <div className="text-xs text-slate-400">
          {streak === 1 ? 'dzień' : streak >= 2 && streak <= 4 ? 'dni' : 'dni'}
        </div>
      </div>
      {!todayActive && streak > 0 && (
        <span className="text-xs text-amber-400 ml-2">Ucz się dziś!</span>
      )}
    </div>
  );
}
