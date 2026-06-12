import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface XPFloatItem {
  id: number;
  amount: number;
  bonus?: number;
}

interface XPFloatProps {
  items: XPFloatItem[];
}

/** Manages a list of short-lived XP float items */
export function useXPFloat() {
  const [items, setItems] = useState<XPFloatItem[]>([]);
  const counter = useRef(0);

  const spawn = useCallback((amount: number, bonus?: number) => {
    const id = ++counter.current;
    setItems(prev => [...prev.slice(-2), { id, amount, bonus }]);
    setTimeout(() => {
      setItems(prev => prev.filter(i => i.id !== id));
    }, 1000);
  }, []);

  return { items, spawn };
}

/** Floating "+XP" indicators that fly up from the bottom-center of the screen */
export function XPFloat({ items }: XPFloatProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-32 z-50 flex justify-center">
      <AnimatePresence>
        {items.map(item => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20, scale: 0.7 }}
            animate={{ opacity: 1, y: -50, scale: 1 }}
            exit={{ opacity: 0, y: -90 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="absolute flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-[#10101a]/90 px-3.5 py-1.5 shadow-[0_0_20px_rgba(99,102,241,0.4)]"
          >
            <span className="font-mono text-base font-bold text-gradient tnum">+{item.amount} XP</span>
            {item.bonus && item.bonus > 0 && (
              <span className="font-mono text-xs font-bold text-amber-400">⚡combo</span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
