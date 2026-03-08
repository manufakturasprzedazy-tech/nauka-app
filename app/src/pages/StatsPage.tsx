import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ActivityHeatmap } from '@/components/stats/ActivityHeatmap';
import { AccuracyChart } from '@/components/stats/AccuracyChart';
import { useStats } from '@/hooks/useStats';

export function StatsPage() {
  const {
    totalXP, totalDays, avgXPPerDay, longestStreak,
    quizAccuracy, heatmap, weakTopics, materialProgress, xpTrend,
    loading,
  } = useStats();

  if (loading) {
    return (
      <div>
        <Header title="Statystyki" showBack />
        <div className="flex items-center justify-center h-64 text-slate-400">Ładowanie...</div>
      </div>
    );
  }

  const maxWeeklyXP = Math.max(...xpTrend.map(w => w.xp), 1);

  return (
    <div>
      <Header title="Statystyki" showBack />
      <div className="px-4 py-4 space-y-5">
        {/* Overview */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Całkowity XP" value={totalXP.toString()} icon="⚡" />
          <StatCard label="Dni nauki" value={totalDays.toString()} icon="📅" />
          <StatCard label="Śr. XP/dzień" value={avgXPPerDay.toString()} icon="📊" />
          <StatCard label="Najdłuższy streak" value={`${longestStreak}d`} icon="🔥" />
        </div>

        {/* Quiz accuracy */}
        <Card variant="default">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-400">Dokładność quiz</span>
            <span className={`text-lg font-bold ${
              quizAccuracy >= 70 ? 'text-emerald-400' :
              quizAccuracy >= 40 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {quizAccuracy}%
            </span>
          </div>
          <ProgressBar value={quizAccuracy / 100} color={
            quizAccuracy >= 70 ? '#10b981' : quizAccuracy >= 40 ? '#f59e0b' : '#ef4444'
          } />
        </Card>

        {/* Heatmap */}
        <Card variant="default">
          <ActivityHeatmap data={heatmap} />
        </Card>

        {/* Weak topics */}
        <Card variant="default">
          <AccuracyChart data={weakTopics} title="Najsłabsze tematy" />
        </Card>

        {/* XP Trend */}
        {xpTrend.length > 0 && (
          <Card variant="default">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Trend XP (tygodniowo)</h3>
            <div className="flex items-end gap-1 h-24">
              {xpTrend.map((week, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[8px] text-slate-500">{week.xp}</span>
                  <div
                    className="w-full bg-blue-600 rounded-t-sm min-h-[2px] transition-all"
                    style={{ height: `${(week.xp / maxWeeklyXP) * 80}px` }}
                  />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Material progress */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Postęp materiałów</h3>
          <div className="space-y-2">
            {materialProgress.map(mp => (
              <Card key={mp.materialId} variant="default">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white font-medium truncate max-w-[70%]">{mp.title}</span>
                  <span className={`text-xs font-bold ${
                    mp.percentage >= 80 ? 'text-emerald-400' :
                    mp.percentage >= 40 ? 'text-amber-400' : 'text-slate-400'
                  }`}>
                    {mp.percentage}%
                  </span>
                </div>
                <ProgressBar value={mp.percentage / 100} size="sm" />
                <div className="flex gap-3 mt-2 text-[10px] text-slate-500">
                  <span>Fiszki: {mp.flashcardsDone}/{mp.flashcardsTotal}</span>
                  <span>Quiz: {mp.quizzesDone}/{mp.quizzesTotal}</span>
                  <span>Kod: {mp.codingDone}/{mp.codingTotal}</span>
                  <span>Wyj: {mp.explanationsDone}/{mp.explanationsTotal}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <Card variant="default">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <div>
          <div className="text-lg font-bold text-white">{value}</div>
          <div className="text-[10px] text-slate-400">{label}</div>
        </div>
      </div>
    </Card>
  );
}
