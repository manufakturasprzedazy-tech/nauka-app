import { cn } from '@/utils/cn';
import type { AchievementDef } from '@/services/gamification';

interface AchievementCardProps {
  achievement: AchievementDef;
  unlocked: boolean;
}

export function AchievementCard({ achievement, unlocked }: AchievementCardProps) {
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl transition-all',
      unlocked ? 'bg-slate-800/60' : 'bg-slate-900/30 opacity-50',
    )}>
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center text-lg',
        unlocked ? 'bg-amber-900/30' : 'bg-slate-800 grayscale',
      )}>
        {achievement.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold', unlocked ? 'text-white' : 'text-slate-500')}>
          {achievement.name}
        </p>
        <p className="text-xs text-slate-500 truncate">{achievement.description}</p>
      </div>
      {unlocked && (
        <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
        </svg>
      )}
    </div>
  );
}
