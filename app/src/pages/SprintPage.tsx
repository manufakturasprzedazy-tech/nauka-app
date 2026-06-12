import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Confetti } from '@/components/ui/Confetti';
import { FormattedText } from '@/components/ui/FormattedText';
import { ComboCounter } from '@/components/feedback/ComboCounter';
import { useContentStore } from '@/stores/contentStore';
import { useSessionStore } from '@/stores/sessionStore';
import { db, getOrCreateTodayActivity, getSetting, setSetting } from '@/db/database';
import { XP, getComboBonus } from '@/services/gamification';
import { awardXP, awardBonusXP } from '@/services/xpService';
import { getStartedMaterialIds } from '@/services/progressService';
import { reportQuestEvent } from '@/services/questService';
import { checkProgressEvents } from '@/services/achievementService';
import { sounds } from '@/services/soundService';
import { haptics } from '@/services/haptics';
import { shuffleArray } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import type { QuizQuestion } from '@/types/content';

const SPRINT_SECONDS = 60;

type Phase = 'launcher' | 'running' | 'finished';

export function SprintPage() {
  const navigate = useNavigate();
  const { quizzes } = useContentStore();
  const combo = useSessionStore(s => s.combo);

  const [phase, setPhase] = useState<Phase>('launcher');
  const [queue, setQueue] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SPRINT_SECONDS);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [bestComboRun, setBestComboRun] = useState(0);
  const [flash, setFlash] = useState<number | null>(null); // index of just-clicked answer
  const [wrongOnes, setWrongOnes] = useState<QuizQuestion[]>([]);
  const [bestScore, setBestScore] = useState(0);
  const [pool, setPool] = useState<QuizQuestion[]>([]);
  const lockRef = useRef(false);

  useEffect(() => {
    getSetting('sprint_best', '0').then(v => setBestScore(Number(v)));
    // Sprint pool: only questions from started lessons
    getStartedMaterialIds().then(started => {
      setPool(quizzes.filter(q => started.has(q.materialId)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown
  useEffect(() => {
    if (phase !== 'running') return;
    if (timeLeft <= 0) {
      finish();
      return;
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft]);

  // Queue exhausted before the timer — finish via effect, never during render
  useEffect(() => {
    if (phase === 'running' && index >= queue.length && queue.length > 0) {
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, queue.length]);

  const start = () => {
    useSessionStore.getState().resetCombo();
    setQueue(shuffleArray(pool));
    setIndex(0);
    setTimeLeft(SPRINT_SECONDS);
    setCorrect(0);
    setAnswered(0);
    setXpEarned(0);
    setBestComboRun(0);
    setWrongOnes([]);
    setPhase('running');
  };

  const finish = async () => {
    setPhase('finished');
    sounds.questDone();
    haptics.celebrate();

    // XP was already written per-answer through the awardXP ledger;
    // here only counters and quests
    if (answered > 0) {
      const activity = await getOrCreateTodayActivity();
      await db.dailyActivity.update(activity.id!, {
        quizAnswered: activity.quizAnswered + answered,
      });
      await reportQuestEvent('quiz_correct', correct);

      const total = Number(await getSetting('sprint_correct_total', '0')) + correct;
      await setSetting('sprint_correct_total', String(total));
      if (correct > bestScore) {
        await setSetting('sprint_best', String(correct));
        setBestScore(correct);
      }
      await checkProgressEvents();
    }
  };

  const answer = async (choiceIndex: number) => {
    if (lockRef.current || phase !== 'running') return;
    lockRef.current = true;
    setFlash(choiceIndex);

    const q = queue[index];
    const isCorrect = choiceIndex === q.correctIndex;
    const newCombo = useSessionStore.getState().registerAnswer(isCorrect);

    // Save attempt so /powtorka picks up mistakes
    db.quizAttempts.add({
      questionId: q.id,
      selectedIndex: choiceIndex,
      isCorrect,
      completedAt: new Date().toISOString(),
    });

    if (isCorrect) {
      sounds.comboTick(newCombo);
      haptics.tap();
      // First correct answer to this question today pays; repeats pay 0
      const base = await awardXP('quiz', q.id, XP.QUIZ_CORRECT);
      const bonus = base > 0 ? await awardBonusXP(getComboBonus(newCombo)) : 0;
      setCorrect(c => c + 1);
      setXpEarned(x => x + base + bonus);
      setBestComboRun(b => Math.max(b, newCombo));
      if (newCombo >= 2) reportQuestEvent('combo', newCombo);
    } else {
      sounds.error();
      haptics.error();
      setWrongOnes(w => [...w, q]);
    }
    setAnswered(a => a + 1);

    setTimeout(() => {
      setFlash(null);
      setIndex(i => i + 1);
      lockRef.current = false;
    }, 350);
  };

  // Launcher
  if (phase === 'launcher') {
    return (
      <div>
        <Header title="Sprint" showBack />
        <div className="px-4 py-8 space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 border border-amber-500/25 text-4xl shadow-[0_0_24px_rgba(245,158,11,0.2)]">
              ⏱️
            </div>
            <h2 className="text-xl font-extrabold text-white mb-2">Sprint 60 sekund</h2>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">
              Jak najwięcej poprawnych odpowiedzi na czas. Seria poprawnych = <b className="text-amber-300">bonus do +5 XP</b>. Błędy trafiają do powtórki.
            </p>
            {bestScore > 0 && (
              <p className="mt-2 text-xs text-amber-300 tnum">🏆 Twój rekord: {bestScore}</p>
            )}
            {pool.length === 0 && (
              <p className="mt-3 text-xs text-slate-500 max-w-xs mx-auto">
                Brak pytań w puli — zacznij najpierw jakąś lekcję w zakładce Kursy.
              </p>
            )}
          </div>
          <Button onClick={start} fullWidth size="lg" disabled={pool.length === 0}>Start!</Button>
        </div>
      </div>
    );
  }

  // Finished
  if (phase === 'finished') {
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    const newRecord = correct >= bestScore && correct > 0;
    return (
      <div>
        <Header title="Sprint — wynik" showBack />
        <Confetti active={newRecord} />
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="px-4 py-8 space-y-5">
          <div className="text-center">
            <div className="text-5xl mb-2">{newRecord ? '🏆' : '⏱️'}</div>
            <h2 className="text-xl font-extrabold text-white">{newRecord ? 'Nowy rekord!' : 'Czas minął!'}</h2>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatBox label="Poprawne" value={String(correct)} accent="text-emerald-400" />
            <StatBox label="Celność" value={`${accuracy}%`} accent="text-indigo-300" />
            <StatBox label="Najlepsze combo" value={bestComboRun > 0 ? `x${bestComboRun}` : '—'} accent="text-amber-300" />
            <StatBox label="Zdobyte XP" value={`+${xpEarned}`} accent="text-gradient" />
          </div>

          {wrongOnes.length > 0 && (
            <Card variant="default" padding="sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Do powtórki ({wrongOnes.length})
              </p>
              <div className="space-y-2">
                {wrongOnes.slice(0, 4).map(q => (
                  <div key={q.id} className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2">
                    <FormattedText text={q.question} className="text-xs text-slate-300" />
                    <p className="mt-1 text-xs text-emerald-400">✓ {q.choices[q.correctIndex]}</p>
                  </div>
                ))}
                {wrongOnes.length > 4 && (
                  <p className="text-center text-[11px] text-slate-500">…i {wrongOnes.length - 4} więcej w Powtórce</p>
                )}
              </div>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/')} fullWidth>Wróć</Button>
            <Button onClick={start} fullWidth>Jeszcze raz!</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Running
  const q = queue[index];
  if (!q) return null; // queue exhausted — the effect above finishes the run
  const urgent = timeLeft <= 10;

  return (
    <div>
      <Header title="Sprint" showBack right={
        <span className={cn('px-2 font-mono text-lg font-bold tnum', urgent ? 'text-rose-400' : 'text-white')}>
          {timeLeft}s
        </span>
      } />
      <ComboCounter combo={combo} />

      {/* Time bar */}
      <div className="px-4 pt-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className={cn('h-full rounded-full transition-all duration-1000 ease-linear', urgent ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-500 to-orange-500')}
            style={{ width: `${(timeLeft / SPRINT_SECONDS) * 100}%` }}
          />
        </div>
        <p className="mt-1.5 text-right text-xs text-slate-500 tnum">✓ {correct}  ·  +{xpEarned} XP</p>
      </div>

      <div className="px-4 py-3 space-y-3">
        <Card variant="elevated">
          <FormattedText text={q.question} className="text-white text-[15px] font-medium" />
        </Card>
        <div className="space-y-2">
          {q.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => answer(i)}
              className={cn(
                'w-full rounded-xl border p-3.5 text-left transition-all min-h-[48px] active:scale-[0.98]',
                flash === i
                  ? i === q.correctIndex
                    ? 'border-emerald-500/50 bg-emerald-500/15'
                    : 'border-rose-500/50 bg-rose-500/15'
                  : 'border-slate-400/15 bg-[#10101a]',
              )}
            >
              <FormattedText text={choice} className="text-sm text-slate-200" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <Card variant="default" padding="sm" className="text-center">
      <div className={cn('text-xl font-extrabold tnum', accent)}>{value}</div>
      <div className="text-[10px] text-slate-400">{label}</div>
    </Card>
  );
}
