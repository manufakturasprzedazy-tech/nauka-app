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
      <div className={cn('w-full bg-slate-800 rounded-full overflow-hidden', heights[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', !color && 'bg-gradient-to-r from-blue-500 to-violet-500')}
          style={{ width: `${percent}%`, ...(color ? { backgroundColor: color } : {}) }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-slate-400 mt-1">{Math.round(percent)}%</span>
      )}
    </div>
  );
}
