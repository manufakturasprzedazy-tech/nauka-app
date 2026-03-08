import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CodeEditor } from './CodeEditor';
import { CodeFeedback } from './CodeFeedback';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { db, getOrCreateTodayActivity, getSetting } from '@/db/database';
import { getCodingXP } from '@/services/gamification';
import { compareCode, type CodeComparisonResult } from '@/services/codeComparison';
import { evaluateCode } from '@/services/aiService';
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
  }, []);

  const handleSubmit = useCallback(async () => {
    setPhase('reviewing');

    let result: CodeComparisonResult;
    let aiReviewed = false;

    if (apiKey) {
      setAiLoading(true);
      try {
        const aiResult = await evaluateCode(
          exercise.description,
          exercise.solution,
          code,
          exercise.testCode || '',
          apiKey
        );
        result = {
          score: aiResult.score,
          feedback: aiResult.feedback,
          matchedConcepts: aiResult.strengths || [],
          missedConcepts: aiResult.improvements || [],
        };
        aiReviewed = true;
        if (aiResult.feedback) setAiFeedback(aiResult.feedback);
      } catch {
        // Fallback to offline
        result = compareCode(code, exercise.solution);
      } finally {
        setAiLoading(false);
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
      aiReviewed,
    });

    const activity = await getOrCreateTodayActivity();
    await db.dailyActivity.update(activity.id!, {
      codingCompleted: activity.codingCompleted + 1,
      xpEarned: activity.xpEarned + xp,
    });

    setPhase('reviewed');
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

  // Extract first line of solution as hint
  const hint = exercise.solution
    .split('\n')
    .find(l => l.trim() && !l.trim().startsWith('#'));

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
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{exercise.description}</p>
      </Card>

      {/* Hint */}
      {showHint && hint && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card variant="outlined" className="border-l-4 border-l-amber-500">
            <div className="text-xs text-amber-400 font-medium mb-1 uppercase tracking-wider">Podpowiedź</div>
            <pre className="text-sm text-slate-300 font-mono">{hint}</pre>
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
            {aiLoading ? 'Sprawdzam...' : 'Sprawdź kod'}
          </Button>
        </div>
      )}

      {/* Reviewing phase — loading */}
      {phase === 'reviewing' && (
        <div className="text-center py-4">
          <div className="text-slate-400 text-sm">Analizuję kod...</div>
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
            {aiFeedback && (
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
