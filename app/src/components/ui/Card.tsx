import { cn } from '@/utils/cn';
import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'glass' | 'glow';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddings = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const cardVariants = {
  default: 'bg-[#10101a] border border-slate-400/10',
  elevated: 'bg-[#181826] border border-slate-400/10 shadow-[0_4px_24px_rgba(0,0,0,0.35)]',
  outlined: 'bg-transparent border border-slate-400/15',
  glass: 'glass',
  glow: 'bg-[#10101a] border border-indigo-500/25 shadow-[0_0_24px_rgba(99,102,241,0.15)]',
};

export function Card({ children, variant = 'default', padding = 'md', className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-2xl', cardVariants[variant], paddings[padding], className)}
      {...props}
    >
      {children}
    </div>
  );
}
