import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CodeEditor } from './CodeEditor';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { db, getOrCreateTodayActivity } from '@/db/database';
import { XP } from '@/services/gamification';
import type { CodingExercise as CodingExerciseType } from '@/types/content';

interface CodingExerciseProps {
  exercise: CodingExerciseType;
}

export function CodingExerciseView({ exercise }: CodingExerciseProps) {
  const [code, setCode] = useState(exercise.starterCode);
  const [showSolution, setShowSolution] = useState(false);
  const [completed, setCompleted] = useState(false);

  const difficultyVariant = exercise.difficulty === 'easy' ? 'success' :
    exercise.difficulty === 'medium' ? 'warning' : 'danger';

  const handleShowSolution = useCallback(async () => {
    setShowSolution(true);
    if (!completed) {
      setCompleted(true);
      await db.codingAttempts.add({
        exerciseId: exercise.id,
        userCode: code,
        completed: true,
        completedAt: new Date().toISOString(),
      });
      const activity = await getOrCreateTodayActivity();
      await db.dailyActivity.update(activity.id!, {
        codingCompleted: activity.codingCompleted + 1,
        xpEarned: activity.xpEarned + XP.CODING_COMPLETE,
      });
    }
  }, [code, completed, exercise.id]);

  const handleReset = () => {
    setCode(exercise.starterCode);
    setShowSolution(false);
  };

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

      {/* Editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-400">Twój kod</span>
          <Button variant="ghost" size="sm" onClick={handleReset}>Resetuj</Button>
        </div>
        <CodeEditor value={code} onChange={setCode} height="200px" />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={handleShowSolution}
          fullWidth
        >
          {showSolution ? 'Ukryj rozwiązanie' : 'Pokaż rozwiązanie'}
        </Button>
      </div>

      {/* Solution */}
      <AnimatePresence>
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
      </AnimatePresence>

      {completed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-emerald-400 text-sm font-medium"
        >
          +{XP.CODING_COMPLETE} XP
        </motion.div>
      )}
    </div>
  );
}
