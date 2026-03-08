import { ProgressBar } from '@/components/ui/ProgressBar';
import { getLevelProgress, getLevelColor } from '@/services/gamification';

interface XPBarProps {
  totalXP: number;
}

export function XPBar({ totalXP }: XPBarProps) {
  const { level, nextThreshold, progress } = getLevelProgress(totalXP);
  const color = getLevelColor(level);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold" style={{ color }}>{level}</span>
        <span className="text-xs text-slate-400">{totalXP} / {nextThreshold} XP</span>
      </div>
      <ProgressBar value={progress} size="sm" color={color} />
    </div>
  );
}
