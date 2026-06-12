import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { XPFloat, useXPFloat } from '@/components/feedback/XPFloat';
import { useContentStore } from '@/stores/contentStore';
import { buildPuzzle, checkOrder, isPuzzleable, type ParsonsPuzzle, type PuzzleLine } from '@/services/parsons';
import { getSetting, setSetting } from '@/db/database';
import { XP } from '@/services/gamification';
import { awardXP } from '@/services/xpService';
import { getStartedMaterialIds } from '@/services/progressService';
import { checkProgressEvents } from '@/services/achievementService';
import { sounds } from '@/services/soundService';
import { haptics } from '@/services/haptics';
import { cn } from '@/utils/cn';

type Phase = 'building' | 'feedback';

export function PuzzlePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const materialId = searchParams.get('material') ? Number(searchParams.get('material')) : undefined;
  const { exercises } = useContentStore();
  const { items, spawn } = useXPFloat();
  const [startedIds, setStartedIds] = useState<Set<number> | null>(null);

  useEffect(() => {
    getStartedMaterialIds().then(setStartedIds);
  }, []);

  const pool = useMemo(
    () => exercises.filter(ex =>
      (materialId ? ex.materialId === materialId : startedIds?.has(ex.materialId)) && isPuzzleable(ex),
    ),
    [exercises, materialId, startedIds],
  );

  const [puzzle, setPuzzle] = useState<ParsonsPuzzle | null>(null);
  const [answer, setAnswer] = useState<PuzzleLine[]>([]);
  const [phase, setPhase] = useState<Phase>('building');
  const [results, setResults] = useState<boolean[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [xpTotal, setXpTotal] = useState(0);

  const startNew = () => {
    const ex = pool[Math.floor(Math.random() * pool.length)];
    setPuzzle(buildPuzzle(ex));
    setAnswer([]);
    setResults([]);
    setAttempts(0);
    setPhase('building');
  };

  const pickLine = (line: PuzzleLine) => {
    haptics.tap();
    setAnswer(prev => [...prev, line]);
  };

  const unpickLine = (index: number) => {
    haptics.tap();
    setAnswer(prev => prev.filter((_, i) => i !== index));
  };

  const check = async () => {
    if (!puzzle) return;
    const res = checkOrder(answer, puzzle.correct);
    setResults(res);
    setPhase('feedback');
    const allOk = res.every(Boolean);
    const tryNo = attempts + 1;
    setAttempts(tryNo);

    if (allOk) {
      sounds.success();
      haptics.success();
      // 5 XP for the first correct arrangement of this puzzle today (ledger-deduped)
      const xp = await awardXP('puzzle', puzzle.exercise.id, XP.PUZZLE_PASS);
      if (xp > 0) {
        spawn(xp);
        setXpTotal(t => t + xp);
      }
      setSolvedCount(c => c + 1);

      const solved = Number(await getSetting('puzzles_solved', '0')) + 1;
      await setSetting('puzzles_solved', String(solved));
      await checkProgressEvents();
    } else {
      sounds.error();
      haptics.error();
    }
  };

  const retry = () => {
    setAnswer([]);
    setResults([]);
    setPhase('building');
  };

  if (pool.length === 0) {
    return (
      <div>
        <Header title="Puzzle z kodu" showBack />
        <EmptyState icon="🧩" title="Brak puzzli" description="Nie znalazłem ćwiczeń nadających się na puzzle w tym zakresie." />
      </div>
    );
  }

  // Launcher
  if (!puzzle) {
    return (
      <div>
        <Header title="Puzzle z kodu" showBack />
        <div className="px-4 py-8 space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-violet-500/10 border border-violet-500/25 text-4xl shadow-[0_0_24px_rgba(139,92,246,0.2)]">
              🧩
            </div>
            <h2 className="text-xl font-extrabold text-white mb-2">Puzzle z kodu</h2>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">
              Ułóż pomieszane linie programu w dobrej kolejności. Uczysz się <b className="text-slate-300">struktury kodu</b> bez walki ze składnią.
            </p>
            <p className="text-xs text-violet-300 mt-2 tnum">{pool.length} puzzli dostępnych</p>
          </div>
          <Button onClick={startNew} fullWidth size="lg">Losuj puzzle</Button>
        </div>
      </div>
    );
  }

  const remaining = puzzle.shuffled.filter(l => !answer.some(a => a.id === l.id));
  const allPlaced = answer.length === puzzle.correct.length;
  const solved = phase === 'feedback' && results.every(Boolean);

  return (
    <div>
      <Header title="Puzzle z kodu" showBack right={
        <span className="text-xs text-slate-400 tnum px-2">🧩 {solvedCount} · ⚡ {xpTotal} XP</span>
      } />
      <XPFloat items={items} />

      <div className="px-4 py-4 space-y-4">
        {/* Task */}
        <Card variant="default" padding="sm">
          <div className="flex items-center gap-2">
            <Badge variant="accent" size="sm">{puzzle.exercise.topic}</Badge>
          </div>
          <p className="mt-1.5 text-sm font-medium text-white">{puzzle.exercise.title}</p>
        </Card>

        {/* Answer area */}
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Twój program ({answer.length}/{puzzle.correct.length})
          </p>
          <div className={cn(
            'min-h-[120px] rounded-xl border bg-[#0c0c14] p-2 space-y-1',
            phase === 'feedback'
              ? solved ? 'border-emerald-500/40' : 'border-rose-500/40'
              : 'border-slate-400/15',
          )}>
            <AnimatePresence>
              {answer.map((line, i) => (
                <motion.button
                  key={line.id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  disabled={phase === 'feedback'}
                  onClick={() => unpickLine(i)}
                  className={cn(
                    'block w-full rounded-lg border px-2.5 py-2 text-left font-mono text-[13px] leading-snug',
                    phase === 'feedback'
                      ? results[i]
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                        : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                      : 'border-indigo-500/25 bg-indigo-500/10 text-slate-100 active:scale-[0.98]',
                  )}
                  style={{ paddingLeft: `${10 + line.indent * 18}px` }}
                >
                  {line.indent > 0 && <span className="mr-1 text-slate-600">{'·'.repeat(line.indent)}</span>}
                  {line.text}
                </motion.button>
              ))}
            </AnimatePresence>
            {answer.length === 0 && (
              <p className="py-8 text-center text-xs text-slate-600">Dotykaj linii poniżej, by budować program ↓</p>
            )}
          </div>
        </div>

        {/* Pool */}
        {remaining.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Dostępne linie</p>
            <div className="space-y-1">
              {remaining.map(line => (
                <motion.button
                  key={line.id}
                  layout
                  onClick={() => pickLine(line)}
                  className="block w-full rounded-lg border border-slate-400/15 bg-[#181826] px-2.5 py-2 text-left font-mono text-[13px] leading-snug text-slate-200 active:scale-[0.98]"
                >
                  {line.text}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {phase === 'building' ? (
          <Button onClick={check} disabled={!allPlaced} fullWidth size="lg">
            Sprawdź
          </Button>
        ) : solved ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <Card variant="glow" padding="sm" className="text-center">
              <p className="text-sm font-bold text-emerald-400">
                ✓ Idealnie!{attempts === 1 ? ' Za pierwszym razem!' : ''}
              </p>
            </Card>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate(-1)} fullWidth>Koniec</Button>
              <Button onClick={startNew} fullWidth>Następne puzzle</Button>
            </div>
          </motion.div>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={startNew} fullWidth>Inne puzzle</Button>
            <Button onClick={retry} fullWidth>Spróbuj jeszcze raz</Button>
          </div>
        )}
      </div>
    </div>
  );
}
