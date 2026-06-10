import { cn } from '@/utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
  size?: 'sm' | 'md';
}

const variants = {
  default: 'bg-white/5 text-slate-300 border border-slate-400/15',
  success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
  warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/25',
  danger: 'bg-rose-500/10 text-rose-400 border border-rose-500/25',
  info: 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/25',
  accent: 'bg-violet-500/10 text-violet-300 border border-violet-500/25',
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
