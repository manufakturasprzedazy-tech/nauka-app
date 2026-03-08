import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { XPBar } from '@/components/gamification/XPBar';
import { StreakCounter } from '@/components/dashboard/StreakCounter';
import { DailyPlan } from '@/components/dashboard/DailyPlan';
import { useProgress } from '@/hooks/useProgress';
import { useStreak } from '@/hooks/useStreak';
import { useFlashcards } from '@/hooks/useFlashcards';
import { db } from '@/db/database';

export function HomePage() {
  const { todayActivity, totalXP, loading } = useProgress();
  const { streak, todayActive } = useStreak();
  const { dueCards, newCards } = useFlashcards();
  const [wrongCount, setWrongCount] = useState(0);

  useEffect(() => {
    // Count wrong quiz answers (not later corrected)
    db.quizAttempts.toArray().then(attempts => {
      const wrongIds = new Set<number>();
      const correctIds = new Set<number>();
      for (const a of attempts) {
        if (a.isCorrect) correctIds.add(a.questionId);
        else wrongIds.add(a.questionId);
      }
      // Remove those that were later answered correctly
      for (const id of correctIds) wrongIds.delete(id);
      setWrongCount(wrongIds.size);
    });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Ładowanie...</div>;
  }

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">NaukaApp</h1>
          <p className="text-slate-400 text-sm mt-0.5">Kontynuuj naukę</p>
        </div>
        <StreakCounter streak={streak} todayActive={todayActive} />
      </div>

      {/* XP Bar */}
      <XPBar totalXP={totalXP} />

      {/* Daily Plan */}
      <DailyPlan activity={todayActivity} />

      {/* Quick actions */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Szybki start</h2>
        <div className="grid grid-cols-2 gap-2">
          <QuickAction
            to="/fiszki"
            icon="🎴"
            label="Fiszki"
            sublabel={`${dueCards.length + newCards.length} do nauki`}
            color="from-blue-600/20 to-blue-800/20"
          />
          <QuickAction
            to="/quiz"
            icon="❓"
            label="Quiz"
            sublabel="Sprawdź wiedzę"
            color="from-emerald-600/20 to-emerald-800/20"
          />
          <QuickAction
            to="/kodowanie"
            icon="💻"
            label="Kodowanie"
            sublabel="Ćwicz pisanie kodu"
            color="from-amber-600/20 to-amber-800/20"
          />
          <QuickAction
            to="/wyjasnianie"
            icon="📝"
            label="Wyjaśnianie"
            sublabel="Naucz się tłumaczyć"
            color="from-violet-600/20 to-violet-800/20"
          />
        </div>
      </div>

      {/* Quiz review badge */}
      {wrongCount > 0 && (
        <Link to="/powtorka">
          <Card variant="default" className="bg-gradient-to-r from-red-600/20 to-orange-600/20 active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔄</span>
                <div>
                  <div className="text-sm font-semibold text-white">Powtórka błędów</div>
                  <div className="text-xs text-slate-400">{wrongCount} pytań do powtórzenia</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold">{wrongCount}</span>
            </div>
          </Card>
        </Link>
      )}
    </div>
  );
}

function QuickAction({ to, icon, label, sublabel, color }: {
  to: string; icon: string; label: string; sublabel: string; color: string;
}) {
  return (
    <Link to={to}>
      <Card variant="default" className={`bg-gradient-to-br ${color} active:scale-[0.97] transition-transform`}>
        <div className="text-2xl mb-2">{icon}</div>
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="text-xs text-slate-400 mt-0.5">{sublabel}</div>
      </Card>
    </Link>
  );
}
