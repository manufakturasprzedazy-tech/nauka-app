import { cn } from '@/utils/cn';

interface ProgressBarProps {
  value: number; // 0-1
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const heights = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export function ProgressBar({ value, color, size = 'md', showLabel, className }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, value * 100));

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full bg-white/5 border border-slate-400/10 rounded-full overflow-hidden', heights[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            !color && 'bg-gradient-to-r from-indigo-500 to-violet-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]',
          )}
          style={{ width: `${percent}%`, ...(color ? { backgroundColor: color } : {}) }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-slate-400 mt-1 tnum">{Math.round(percent)}%</span>
      )}
    </div>
  );
}
