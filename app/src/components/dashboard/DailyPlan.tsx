import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { useAppStore } from '@/stores/appStore';
import type { DailyActivity } from '@/types/progress';

interface DailyPlanProps {
  activity: DailyActivity | null;
}

export function DailyPlan({ activity }: DailyPlanProps) {
  const { dailyGoal } = useAppStore();

  if (!activity) return null;

  const items = [
    { label: 'Fiszki', done: activity.flashcardsReviewed, goal: dailyGoal.flashcards, link: '/fiszki', color: '#3b82f6', icon: '🎴' },
    { label: 'Quiz', done: activity.quizAnswered, goal: dailyGoal.quizzes, link: '/quiz', color: '#10b981', icon: '❓' },
    { label: 'Kodowanie', done: activity.codingCompleted, goal: dailyGoal.coding, link: '/kodowanie', color: '#f59e0b', icon: '💻' },
  ];

  const totalDone = items.reduce((s, i) => s + Math.min(i.done, i.goal), 0);
  const totalGoal = items.reduce((s, i) => s + i.goal, 0);
  const overallProgress = totalGoal > 0 ? totalDone / totalGoal : 0;

  return (
    <Card variant="elevated" padding="lg">
      <div className="flex items-center gap-4 mb-4">
        <ProgressRing value={overallProgress} size={80} strokeWidth={6}>
          <span className="text-lg font-bold text-white">{Math.round(overallProgress * 100)}%</span>
        </ProgressRing>
        <div>
          <h3 className="text-white font-bold text-base">Cel dzienny</h3>
          <p className="text-slate-400 text-sm">{totalDone} / {totalGoal} aktywności</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {items.map(item => {
          const progress = item.goal > 0 ? Math.min(1, item.done / item.goal) : 0;
          const isDone = item.done >= item.goal;

          return (
            <Link key={item.label} to={item.link}>
              <div className="bg-slate-800/60 rounded-xl p-3 active:scale-[0.97] transition-transform">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-xs font-medium text-slate-300">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress * 100}%`, backgroundColor: item.color }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {isDone ? '✓' : `${item.done}/${item.goal}`}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
