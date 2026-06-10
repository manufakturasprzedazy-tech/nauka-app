import { AnimatePresence, motion } from 'framer-motion';
import { getComboMultiplier } from '@/stores/sessionStore';
import { cn } from '@/utils/cn';

interface ComboCounterProps {
  combo: number;
}

/** Floating combo pill — appears from combo 2 up, glow intensifies with combo */
export function ComboCounter({ combo }: ComboCounterProps) {
  const multiplier = getComboMultiplier(combo);
  const hot = combo >= 10;
  const warm = combo >= 5;

  return (
    <AnimatePresence>
      {combo >= 2 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6 }}
          className="pointer-events-none fixed right-4 top-16 z-40"
        >
          <div
            key={combo}
            className={cn(
              'combo-pop flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono font-bold',
              hot
                ? 'border-rose-500/40 bg-rose-500/15 text-rose-300 shadow-[0_0_24px_rgba(244,63,94,0.5)]'
                : warm
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                  : 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300 shadow-[0_0_16px_rgba(99,102,241,0.35)]',
            )}
          >
            <span className="text-sm">{hot ? '🔥' : '⚡'}</span>
            <span className="text-sm tnum">x{combo}</span>
            {multiplier > 1 && <span className="text-[10px] opacity-80">XP x{multiplier}</span>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
