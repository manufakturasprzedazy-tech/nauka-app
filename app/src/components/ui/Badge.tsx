import { cn } from '@/utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
}

const variants = {
  default: 'bg-slate-700 text-slate-300',
  success: 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/50',
  warning: 'bg-amber-900/50 text-amber-400 border border-amber-700/50',
  danger: 'bg-red-900/50 text-red-400 border border-red-700/50',
  info: 'bg-blue-900/50 text-blue-400 border border-blue-700/50',
};

export function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center font-medium rounded-full',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      variants[variant],
    )}>
      {children}
    </span>
  );
}
