import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CodeEditor } from './CodeEditor';
import { CodeFeedback, type TestOutcome } from './CodeFeedback';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FormattedText } from '@/components/ui/FormattedText';
import { db, getOrCreateTodayActivity } from '@/db/database';
import { getApiKey } from '@/services/cryptoService';
import { XP } from '@/services/gamification';
import { awardXP } from '@/services/xpService';
import { reportQuestEvent } from '@/services/questService';
import { checkProgressEvents } from '@/services/achievementService';
import { sounds } from '@/services/soundService';
import { haptics } from '@/services/haptics';
import { evaluateCode } from '@/services/aiService';
import { runPython, preload } from '@/services/pythonRunner';
import type { CodingExercise as CodingExerciseType } from '@/types/content';

interface CodingExerciseProps {
  exercise: CodingExerciseType;
}

type Phase = 'writing' | 'reviewing' | 'reviewed';

export function CodingExerciseView({ exercise }: CodingExerciseProps) {
  const [code, setCode] = useState(exercise.starterCode);
  const [phase, setPhase] = useState<Phase>('writing');
  const [showSolution, setShowSolution] = useState(false);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [feedbackResult, setFeedbackResult] = useState<TestOutcome | null>(null);
  const [testsUnavailable, setTestsUnavailable] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  const difficultyVariant = exercise.difficulty === 'easy' ? 'success' :
    exercise.difficulty === 'medium' ? 'warning' : 'danger';

  useEffect(() => {
    getApiKey('claude_api_key').then(key => {
      if (key) setApiKey(key);
    });
    preload();
  }, []);

  const handleSubmit = useCallback(async () => {
    setPhase('reviewing');
    setTestsUnavailable(false);

    // Code is judged ONLY by tests — pass/fail, no heuristic guessing.
    const hasAsserts = /(^|\n)\s*assert /.test(exercise.testCode ?? '');
    let outcome: TestOutcome;

    if (!hasAsserts) {
      outcome = {
        passed: false,
        passRate: 0,
        noTests: true,
        feedback: 'To ćwiczenie nie ma testów automatycznych. Porównaj swój kod z rozwiązaniem wzorcowym — XP nie jest tu przyznawane.',
      };
    } else {
      try {
        const pyResult = await runPython(code, exercise.testCode);
        const errors: string[] = [];

        if (pyResult.syntaxError) {
          outcome = { passed: false, passRate: 0, feedback: `Błąd składni: ${pyResult.syntaxError}`, errors: [pyResult.syntaxError] };
        } else if (pyResult.runtimeError) {
          outcome = { passed: false, passRate: 0, feedback: `Błąd wykonania: ${pyResult.runtimeError}`, errors: [pyResult.runtimeError] };
        } else {
          const { passRate } = pyResult;
          const passed = passRate === 1;
          for (const t of pyResult.testResults) {
            if (!t.passed && t.error) errors.push(`${t.test}: ${t.error}`);
          }
          outcome = {
            passed,
            passRate,
            feedback: passed
              ? 'Wszystkie testy przechodzą — zaliczone!'
              : 'Część testów nie przechodzi. Zobacz poniżej, które dokładnie — popraw kod i sprawdź ponownie.',
            errors: errors.length > 0 ? errors : undefined,
            testResults: pyResult.testResults,
          };
        }
      } catch {
        // Pyodide failed to load (e.g. fully offline before first cache) — no verdict, no fake score
        setTestsUnavailable(true);
        setPhase('writing');
        return;
      }
    }

    setFeedbackResult(outcome);

    // XP: 15 only for the first 100% pass of this exercise today
    let xp = 0;
    if (outcome.passed) {
      xp = await awardXP('coding', exercise.id, XP.CODING_PASS);
    }
    setXpEarned(xp);

    // Save attempt — completed only when ALL tests pass
    await db.codingAttempts.add({
      exerciseId: exercise.id,
      userCode: code,
      completed: outcome.passed,
      completedAt: new Date().toISOString(),
      score: outcome.passed ? 5 : Math.max(1, Math.round(outcome.passRate * 4)),
      aiReviewed: false,
    });

    if (outcome.passed) {
      const activity = await getOrCreateTodayActivity();
      await db.dailyActivity.update(activity.id!, {
        codingCompleted: activity.codingCompleted + 1,
      });
      sounds.success();
      haptics.success();
      await reportQuestEvent('coding');
    } else {
      sounds.error();
      haptics.error();
    }
    await checkProgressEvents();

    setPhase('reviewed');

    // Optional AI feedback in background (doesn't affect score)
    if (apiKey) {
      setAiLoading(true);
      evaluateCode(exercise.description, exercise.solution, code, exercise.testCode || '', apiKey)
        .then(aiResult => {
          if (aiResult.feedback) setAiFeedback(aiResult.feedback);
        })
        .catch(() => {})
        .finally(() => setAiLoading(false));
    }
  }, [code, exercise, apiKey]);

  const handleReset = () => {
    setCode(exercise.starterCode);
    setPhase('writing');
    setShowSolution(false);
    setHintsRevealed(0);
    setFeedbackResult(null);
    setAiFeedback(null);
    setXpEarned(0);
  };

  // Use hints from data, fallback to extracting from solution
  const hints = exercise.hints && exercise.hints.length > 0
    ? exercise.hints
    : (() => {
        const line = exercise.solution.split('\n').find(l => l.trim() && !l.trim().startsWith('#'));
        return line ? [line] : [];
      })();

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={difficultyVariant}>{exercise.difficulty}</Badge>
          <Badge>{exercise.topic}</Badge>
        </div>
        <h2 className="text-lg font-bold text-white">{exercise.title}</h2>
      </div>

      {/* Description */}
      <Card variant="outlined">
        <FormattedText text={exercise.description} className="text-sm text-slate-300" />
      </Card>

      {/* Hints — revealed progressively, one at a time */}
      {hintsRevealed > 0 && hints.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card variant="outlined" className="border-l-4 border-l-amber-500">
            <div className="text-xs text-amber-400 font-medium mb-1 uppercase tracking-wider">
              Podpowiedzi ({Math.min(hintsRevealed, hints.length)}/{hints.length})
            </div>
            <ul className="text-sm text-slate-300 space-y-1">
              {hints.slice(0, hintsRevealed).map((h, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-amber-500 shrink-0">•</span>
                  <FormattedText text={h} className="inline" />
                </li>
              ))}
            </ul>
            {hintsRevealed < hints.length && (
              <button
                onClick={() => setHintsRevealed(n => n + 1)}
                className="mt-2 text-xs font-semibold text-amber-400 underline-offset-2 hover:underline"
              >
                Pokaż kolejną podpowiedź →
              </button>
            )}
          </Card>
        </motion.div>
      )}

      {/* Editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-400">Twój kod</span>
          <Button variant="ghost" size="sm" onClick={handleReset}>Resetuj</Button>
        </div>
        <CodeEditor value={code} onChange={setCode} height="200px" />
      </div>

      {/* Tests unavailable (Pyodide offline before first cache) */}
      {testsUnavailable && (
        <Card variant="outlined" className="border-l-4 border-l-amber-500">
          <p className="text-sm text-slate-300">
            ⚠️ Nie mogę teraz uruchomić testów (środowisko Pythona wymaga jednorazowego pobrania online).
            Połącz się z internetem i spróbuj ponownie — nie zgaduję ocen.
          </p>
        </Card>
      )}

      {/* Actions — writing phase */}
      {phase === 'writing' && (
        <div className="flex gap-2">
          {hintsRevealed === 0 && hints.length > 0 && (
            <Button variant="ghost" onClick={() => setHintsRevealed(1)} fullWidth>
              Podpowiedź
            </Button>
          )}
          <Button onClick={handleSubmit} fullWidth disabled={code.trim() === exercise.starterCode.trim()}>
            Sprawdź kod
          </Button>
        </div>
      )}

      {/* Reviewing phase — loading */}
      {phase === 'reviewing' && (
        <div className="text-center py-4">
          <div className="text-slate-400 text-sm">Uruchamiam testy...</div>
        </div>
      )}

      {/* Reviewed phase — feedback */}
      <AnimatePresence>
        {phase === 'reviewed' && feedbackResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4"
          >
            <CodeFeedback outcome={feedbackResult} xpEarned={xpEarned} />

            {/* AI detailed feedback */}
            {aiLoading && (
              <Card variant="outlined" className="border-l-4 border-l-violet-500/50">
                <div className="text-xs text-violet-400/70 font-medium uppercase tracking-wider">
                  Ładuję feedback AI...
                </div>
              </Card>
            )}
            {aiFeedback && !aiLoading && (
              <Card variant="outlined" className="border-l-4 border-l-violet-500">
                <div className="text-xs text-violet-400 font-medium mb-1 uppercase tracking-wider">Feedback AI</div>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{aiFeedback}</p>
              </Card>
            )}

            {/* Show solution button — only after review */}
            <Button
              variant="secondary"
              onClick={() => setShowSolution(!showSolution)}
              fullWidth
            >
              {showSolution ? 'Ukryj rozwiązanie' : 'Pokaż rozwiązanie'}
            </Button>

            {showSolution && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="mb-2">
                  <span className="text-sm font-medium text-emerald-400">Rozwiązanie wzorcowe</span>
                </div>
                <CodeEditor value={exercise.solution} readOnly height="200px" />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
