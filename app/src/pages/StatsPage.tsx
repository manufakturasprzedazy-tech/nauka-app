import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ActivityHeatmap } from '@/components/stats/ActivityHeatmap';
import { AccuracyChart } from '@/components/stats/AccuracyChart';
import { useStats } from '@/hooks/useStats';
import { getSetting, db } from '@/db/database';
import { cn } from '@/utils/cn';

type Tab = 'overview' | 'activity' | 'skills';

export function StatsPage() {
  const {
    totalXP, totalDays, avgXPPerDay, longestStreak,
    quizAccuracy, heatmap, weakTopics, materialProgress, xpTrend,
    loading,
  } = useStats();
  const [tab, setTab] = useState<Tab>('overview');
  const [bestCombo, setBestCombo] = useState(0);
  const [questsDone, setQuestsDone] = useState(0);

  useEffect(() => {
    getSetting('best_combo', '0').then(v => setBestCombo(Number(v)));
    db.dailyQuests.toArray().then(list => setQuestsDone(list.filter(q => q.completed).length));
  }, []);

  if (loading) {
    return (
      <div>
        <Header title="Statystyki" showBack />
        <div className="px-4 py-4"><SkeletonList count={4} /></div>
      </div>
    );
  }

  const maxWeeklyXP = Math.max(...xpTrend.map(w => w.xp), 1);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: '📈 Przegląd' },
    { key: 'activity', label: '🗓️ Aktywność' },
    { key: 'skills', label: '🎯 Umiejętności' },
  ];

  return (
    <div>
      <Header title="Statystyki" showBack />

      {/* Tabs */}
      <div className="flex gap-1.5 px-4 py-3">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-all',
              tab === t.key
                ? 'border-indigo-500 bg-indigo-600 text-white shadow-[0_0_16px_rgba(99,102,241,0.35)]'
                : 'border-slate-400/10 bg-white/[0.03] text-slate-400',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="px-4 pb-6 space-y-5">
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Całkowity XP" value={totalXP.toString()} icon="⚡" />
              <StatCard label="Dni nauki" value={totalDays.toString()} icon="📅" />
              <StatCard label="Śr. XP/dzień" value={avgXPPerDay.toString()} icon="📊" />
              <StatCard label="Najdłuższa seria" value={`${longestStreak}d`} icon="🔥" />
              <StatCard label="Najlepsze combo" value={bestCombo > 0 ? `x${bestCombo}` : '—'} icon="⚡" />
              <StatCard label="Questy zaliczone" value={questsDone.toString()} icon="✅" />
            </div>

            <Card variant="default">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-400">Dokładność quiz</span>
                <span className={`text-lg font-bold tnum ${
                  quizAccuracy >= 70 ? 'text-emerald-400' :
                  quizAccuracy >= 40 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {quizAccuracy}%
                </span>
              </div>
              <ProgressBar value={quizAccuracy / 100} color={
                quizAccuracy >= 70 ? '#10b981' : quizAccuracy >= 40 ? '#f59e0b' : '#f43f5e'
              } />
            </Card>
          </>
        )}

        {tab === 'activity' && (
          <>
            <Card variant="default">
              <ActivityHeatmap data={heatmap} />
            </Card>

            {xpTrend.length > 0 && (
              <Card variant="default">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Trend XP (tygodniowo)</h3>
                <div className="flex items-end gap-1 h-28">
                  {xpTrend.map((week, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 justify-end">
                      <span className="text-[8px] text-slate-500 tnum">{week.xp}</span>
                      <div
                        className="w-full rounded-t-md min-h-[2px] bg-gradient-to-t from-indigo-600 to-violet-500 shadow-[0_0_8px_rgba(99,102,241,0.3)] transition-all"
                        style={{ height: `${(week.xp / maxWeeklyXP) * 88}px` }}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {tab === 'skills' && (
          <>
            <Card variant="default">
              <AccuracyChart data={weakTopics} title="Najsłabsze tematy" />
            </Card>

            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Postęp materiałów</h3>
              <div className="space-y-2">
                {materialProgress.map(mp => (
                  <Card key={mp.materialId} variant="default">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white font-medium truncate max-w-[70%]">{mp.title}</span>
                      <span className={`text-xs font-bold tnum ${
                        mp.percentage >= 80 ? 'text-emerald-400' :
                        mp.percentage >= 40 ? 'text-amber-400' : 'text-slate-400'
                      }`}>
                        {mp.percentage}%
                      </span>
                    </div>
                    <ProgressBar value={mp.percentage / 100} size="sm" />
                    <div className="flex gap-3 mt-2 text-[10px] text-slate-500 tnum">
                      <span>Fiszki: {mp.flashcardsDone}/{mp.flashcardsTotal}</span>
                      <span>Quiz: {mp.quizzesDone}/{mp.quizzesTotal}</span>
                      <span>Kod: {mp.codingDone}/{mp.codingTotal}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <Card variant="default">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <div>
          <div className="text-lg font-bold text-white tnum">{value}</div>
          <div className="text-[10px] text-slate-400">{label}</div>
        </div>
      </div>
    </Card>
  );
}
