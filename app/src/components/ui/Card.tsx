import { cn } from '@/utils/cn';
import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddings = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const cardVariants = {
  default: 'bg-slate-900/50 backdrop-blur-sm',
  elevated: 'bg-slate-800/80 shadow-xl shadow-black/20',
  outlined: 'bg-transparent border border-slate-700/50',
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
