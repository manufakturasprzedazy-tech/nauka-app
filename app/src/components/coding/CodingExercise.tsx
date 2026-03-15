import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CodeEditor } from './CodeEditor';
import { CodeFeedback } from './CodeFeedback';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FormattedText } from '@/components/ui/FormattedText';
import { db, getOrCreateTodayActivity, getSetting } from '@/db/database';
import { getCodingXP } from '@/services/gamification';
import { compareCode, type CodeComparisonResult } from '@/services/codeComparison';
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
  const [showHint, setShowHint] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<CodeComparisonResult | null>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  const difficultyVariant = exercise.difficulty === 'easy' ? 'success' :
    exercise.difficulty === 'medium' ? 'warning' : 'danger';

  useEffect(() => {
    getSetting('claude_api_key', '').then(key => {
      if (key) setApiKey(key);
    });
    preload();
  }, []);

  const handleSubmit = useCallback(async () => {
    setPhase('reviewing');

    let result: CodeComparisonResult;

    // Try Pyodide if there's test code
    if (exercise.testCode?.trim()) {
      try {
        const pyResult = await runPython(code, exercise.testCode);

        let score: number;
        let feedback: string;
        const errors: string[] = [];

        if (pyResult.syntaxError) {
          score = 1;
          feedback = `Błąd składni: ${pyResult.syntaxError}`;
          errors.push(pyResult.syntaxError);
        } else if (pyResult.runtimeError) {
          score = 1;
          feedback = `Błąd wykonania: ${pyResult.runtimeError}`;
          errors.push(pyResult.runtimeError);
        } else {
          const { passRate } = pyResult;
          if (passRate === 1) { score = 5; feedback = 'Wszystkie testy przechodzą!'; }
          else if (passRate >= 0.75) { score = 4; feedback = 'Prawie wszystko działa!'; }
          else if (passRate >= 0.5) { score = 3; feedback = 'Ponad połowa testów przechodzi.'; }
          else if (passRate >= 0.25) { score = 2; feedback = 'Część testów przechodzi.'; }
          else { score = 1; feedback = 'Większość testów nie przeszła.'; }

          for (const t of pyResult.testResults) {
            if (!t.passed && t.error) errors.push(`${t.test}: ${t.error}`);
          }
        }

        result = {
          score,
          feedback,
          matchedConcepts: [],
          missedConcepts: [],
          errors: errors.length > 0 ? errors : undefined,
          testResults: pyResult.testResults,
        };
      } catch {
        // Pyodide unavailable, fallback to offline comparison
        result = compareCode(code, exercise.solution);
      }
    } else {
      result = compareCode(code, exercise.solution);
    }

    setFeedbackResult(result);

    const xp = getCodingXP(result.score);
    setXpEarned(xp);

    // Save attempt
    await db.codingAttempts.add({
      exerciseId: exercise.id,
      userCode: code,
      completed: true,
      completedAt: new Date().toISOString(),
      score: result.score,
      aiReviewed: false,
    });

    const activity = await getOrCreateTodayActivity();
    await db.dailyActivity.update(activity.id!, {
      codingCompleted: activity.codingCompleted + 1,
      xpEarned: activity.xpEarned + xp,
    });

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
    setShowHint(false);
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

      {/* Hints */}
      {showHint && hints.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card variant="outlined" className="border-l-4 border-l-amber-500">
            <div className="text-xs text-amber-400 font-medium mb-1 uppercase tracking-wider">
              {hints.length > 1 ? 'Podpowiedzi' : 'Podpowiedź'}
            </div>
            <ul className="text-sm text-slate-300 space-y-1">
              {hints.map((h, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-amber-500 shrink-0">•</span>
                  <FormattedText text={h} className="inline" />
                </li>
              ))}
            </ul>
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

      {/* Actions — writing phase */}
      {phase === 'writing' && (
        <div className="flex gap-2">
          {!showHint && (
            <Button variant="ghost" onClick={() => setShowHint(true)} fullWidth>
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
            <CodeFeedback result={feedbackResult} xpEarned={xpEarned} />

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
