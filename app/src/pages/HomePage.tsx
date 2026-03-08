import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { XPBar } from '@/components/gamification/XPBar';
import { StreakCounter } from '@/components/dashboard/StreakCounter';
import { DailyPlan } from '@/components/dashboard/DailyPlan';
import { useProgress } from '@/hooks/useProgress';
import { useStreak } from '@/hooks/useStreak';
import { useFlashcards } from '@/hooks/useFlashcards';

export function HomePage() {
  const { todayActivity, totalXP, loading } = useProgress();
  const { streak, todayActive } = useStreak();
  const { dueCards, newCards } = useFlashcards();

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
