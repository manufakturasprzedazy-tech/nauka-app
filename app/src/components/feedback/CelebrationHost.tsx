import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Confetti } from '@/components/ui/Confetti';
import { useCelebrationStore, type Celebration } from '@/stores/celebrationStore';
import { ACHIEVEMENTS, getLevelColor } from '@/services/gamification';
import { sounds } from '@/services/soundService';
import { haptics } from '@/services/haptics';

/** Mounted once in App — renders the celebration queue one modal at a time */
export function CelebrationHost() {
  const { queue, dismiss } = useCelebrationStore();
  const current = queue[0] ?? null;

  useEffect(() => {
    if (!current) return;
    if (current.type === 'levelup') sounds.levelUp();
    else if (current.type === 'quest') sounds.questDone();
    else sounds.success();
    haptics.celebrate();
    const timer = setTimeout(dismiss, 3500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  return (
    <>
      <Confetti active={!!current} />
      <AnimatePresence>
        {current && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6"
            onClick={dismiss}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: 'spring', damping: 16 }}
              className="glass w-full max-w-xs rounded-3xl border-indigo-500/25 p-8 text-center shadow-[0_0_60px_rgba(99,102,241,0.35)]"
            >
              <CelebrationContent c={current} />
              <p className="mt-5 text-xs text-slate-500">Dotknij, aby zamknąć</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function CelebrationContent({ c }: { c: Celebration }) {
  switch (c.type) {
    case 'levelup':
      return (
        <>
          <Wobble emoji="🎉" />
          <h2 className="text-xl font-extrabold text-white mb-1">Nowy poziom!</h2>
          <div className="text-3xl font-black" style={{ color: getLevelColor(c.level) }}>
            {c.level}
          </div>
        </>
      );
    case 'achievement': {
      const def = ACHIEVEMENTS.find(a => a.id === c.id);
      return (
        <>
          <Wobble emoji={def?.icon ?? '🏅'} />
          <h2 className="text-xl font-extrabold text-white mb-1">Osiągnięcie!</h2>
          <div className="text-lg font-bold text-gradient">{def?.name ?? c.id}</div>
          {def && <p className="mt-1 text-sm text-slate-400">{def.description}</p>}
        </>
      );
    }
    case 'streak':
      return (
        <>
          <Wobble emoji="🔥" />
          <h2 className="text-xl font-extrabold text-white mb-1">Seria {c.days} dni!</h2>
          <p className="text-sm text-slate-400">Konsekwencja to supermoc. Tak trzymaj!</p>
        </>
      );
    case 'quest':
      return (
        <>
          <Wobble emoji="✅" />
          <h2 className="text-xl font-extrabold text-white mb-1">Quest ukończony!</h2>
          <div className="text-base font-bold text-white">{c.name}</div>
          <p className="mt-1 font-mono text-sm font-bold text-emerald-400 tnum">+{c.xp} XP</p>
        </>
      );
  }
}

function Wobble({ emoji }: { emoji: string }) {
  return (
    <motion.div
      animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.15, 1] }}
      transition={{ duration: 0.6, delay: 0.25 }}
      className="mb-3 text-6xl"
    >
      {emoji}
    </motion.div>
  );
}
