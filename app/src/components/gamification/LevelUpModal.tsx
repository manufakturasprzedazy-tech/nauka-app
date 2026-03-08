import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Confetti } from '@/components/ui/Confetti';
import { getLevelColor } from '@/services/gamification';
import type { Level } from '@/types/progress';

interface LevelUpModalProps {
  level: Level | null;
  onDismiss: () => void;
}

export function LevelUpModal({ level, onDismiss }: LevelUpModalProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (level) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        onDismiss();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [level, onDismiss]);

  return (
    <>
      <Confetti active={!!level} />
      <AnimatePresence>
        {show && level && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => { setShow(false); onDismiss(); }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', damping: 15 }}
              className="text-center p-8"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-6xl mb-4"
              >
                🎉
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">Nowy poziom!</h2>
              <div
                className="text-4xl font-black mb-4"
                style={{ color: getLevelColor(level) }}
              >
                {level}
              </div>
              <p className="text-slate-400 text-sm">Dotknij aby zamknąć</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
