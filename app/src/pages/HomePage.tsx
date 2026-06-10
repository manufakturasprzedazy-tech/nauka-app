import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { XPBar } from '@/components/gamification/XPBar';
import { StreakCounter } from '@/components/dashboard/StreakCounter';
import { DailyPlan } from '@/components/dashboard/DailyPlan';
import { DailyQuests } from '@/components/dashboard/DailyQuests';
import { useProgress } from '@/hooks/useProgress';
import { useStreak } from '@/hooks/useStreak';
import { useFlashcards } from '@/hooks/useFlashcards';
import { getLevelProgress } from '@/services/gamification';
import { MascotBubble } from '@/components/mascot/MascotBubble';
import { mascotSay, greetingContext } from '@/services/mascotMessages';
import { db } from '@/db/database';
import { useMemo } from 'react';

export function HomePage() {
  const { todayActivity, totalXP, loading } = useProgress();
  const { streak, todayActive } = useStreak();
  const { dueCards, newCards } = useFlashcards();
  const [wrongCount, setWrongCount] = useState(0);

  const mascotMessage = useMemo(() => {
    if (streak > 0 && !todayActive) return { text: mascotSay('streak_danger'), mood: 'thinking' as const };
    if (streak >= 3 && todayActive) return { text: mascotSay('streak_active'), mood: 'happy' as const };
    return { text: mascotSay(greetingContext()), mood: 'idle' as const };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak, todayActive]);

  useEffect(() => {
    // Count wrong quiz answers (not later corrected)
    db.quizAttempts.toArray().then(attempts => {
      const wrongIds = new Set<number>();
      const correctIds = new Set<number>();
      for (const a of attempts) {
        if (a.isCorrect) correctIds.add(a.questionId);
        else wrongIds.add(a.questionId);
      }
      for (const id of correctIds) wrongIds.delete(id);
      setWrongCount(wrongIds.size);
    });
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  const { level } = getLevelProgress(totalXP);

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gradient">Czas na naukę</h1>
        <StreakCounter streak={streak} todayActive={todayActive} />
      </div>

      {/* Mascot greeting */}
      <MascotBubble message={mascotMessage.text} mood={mascotMessage.mood} />

      {/* Hero — level + XP */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card variant="glow" padding="lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Poziom</p>
              <p className="text-xl font-extrabold text-white">{level}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Łącznie</p>
              <p className="text-xl font-extrabold tnum text-gradient">{totalXP} XP</p>
            </div>
          </div>
          <XPBar totalXP={totalXP} />
        </Card>
      </motion.div>

      {/* Streak danger warning */}
      {!todayActive && streak > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="border-orange-500/30 bg-orange-500/5">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-orange-300">Twoja seria {streak} dni jest zagrożona!</p>
                <p className="text-xs text-slate-400">Zrób dziś chociaż jedną aktywność, żeby jej nie stracić.</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Daily Plan */}
      <DailyPlan activity={todayActivity} />

      {/* Daily Quests */}
      <DailyQuests />

      {/* Quick actions */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Szybki start</h2>
        <div className="grid grid-cols-2 gap-2">
          <QuickAction
            to="/fiszki"
            icon="🎴"
            label="Fiszki"
            sublabel={`${dueCards.length + newCards.length} do nauki`}
            accent="indigo"
          />
          <QuickAction to="/quiz" icon="❓" label="Quiz" sublabel="Sprawdź wiedzę" accent="emerald" />
          <QuickAction to="/kodowanie" icon="💻" label="Kodowanie" sublabel="Ćwicz pisanie kodu" accent="amber" />
          <QuickAction to="/powtorka" icon="🔄" label="Powtórka" sublabel="Popraw błędy" accent="rose" />
        </div>
      </div>

      {/* Quiz review badge */}
      {wrongCount > 0 && (
        <Link to="/powtorka">
          <Card variant="default" className="border-rose-500/25 bg-rose-500/5 active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔄</span>
                <div>
                  <div className="text-sm font-semibold text-white">Powtórka błędów</div>
                  <div className="text-xs text-slate-400">{wrongCount} pytań do powtórzenia</div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-xs font-bold tnum shadow-[0_0_12px_rgba(244,63,94,0.5)]">
                {wrongCount}
              </span>
            </div>
          </Card>
        </Link>
      )}
    </div>
  );
}

const accents: Record<string, { box: string; glow: string }> = {
  indigo: { box: 'bg-indigo-500/15 border-indigo-500/25', glow: 'group-active:shadow-[0_0_20px_rgba(99,102,241,0.3)]' },
  emerald: { box: 'bg-emerald-500/15 border-emerald-500/25', glow: 'group-active:shadow-[0_0_20px_rgba(16,185,129,0.3)]' },
  amber: { box: 'bg-amber-500/15 border-amber-500/25', glow: 'group-active:shadow-[0_0_20px_rgba(245,158,11,0.3)]' },
  rose: { box: 'bg-rose-500/15 border-rose-500/25', glow: 'group-active:shadow-[0_0_20px_rgba(244,63,94,0.3)]' },
};

function QuickAction({ to, icon, label, sublabel, accent }: {
  to: string; icon: string; label: string; sublabel: string; accent: keyof typeof accents;
}) {
  const a = accents[accent];
  return (
    <Link to={to} className="group">
      <Card variant="default" className={`active:scale-[0.97] transition-all ${a.glow}`}>
        <div className={`mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl border text-xl ${a.box}`}>
          {icon}
        </div>
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="text-xs text-slate-400 mt-0.5">{sublabel}</div>
      </Card>
    </Link>
  );
}
