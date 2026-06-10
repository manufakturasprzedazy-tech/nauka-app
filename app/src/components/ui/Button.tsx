import { cn } from '@/utils/cn';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  fullWidth?: boolean;
}

const variants = {
  primary:
    'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 active:from-indigo-700 active:to-violet-700 shadow-lg shadow-indigo-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
  secondary:
    'bg-[#181826] text-slate-200 hover:bg-[#1f1f30] active:bg-[#10101a] border border-slate-400/15',
  ghost: 'text-slate-300 hover:bg-white/5 active:bg-white/10',
  danger: 'bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 shadow-lg shadow-rose-500/20',
  success: 'bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 shadow-lg shadow-emerald-500/20',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl min-h-[44px]',
  lg: 'px-6 py-3.5 text-base rounded-xl min-h-[48px]',
};

export function Button({ variant = 'primary', size = 'md', fullWidth, className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'font-semibold transition-all duration-150 select-none active:scale-[0.97]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
