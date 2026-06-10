import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center py-12 px-6"
    >
      {icon && (
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-4xl shadow-[0_0_24px_rgba(99,102,241,0.15)]">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-white">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-slate-400 max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
