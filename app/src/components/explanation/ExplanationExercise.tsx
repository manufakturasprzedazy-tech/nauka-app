import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { db, getOrCreateTodayActivity } from '@/db/database';
import { getExplanationXP } from '@/services/gamification';
import { calculateSM2, SM2_DEFAULTS } from '@/services/sm2';
import type { Explanation } from '@/types/content';

interface ExplanationExerciseProps {
  explanation: Explanation;
  onNext: () => void;
}

export function ExplanationExercise({ explanation, onNext }: ExplanationExerciseProps) {
  const [userAnswer, setUserAnswer] = useState('');
  const [showModel, setShowModel] = useState(false);
  const [selfRating, setSelfRating] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = userAnswer.trim().length >= 50;

  const handleShowAnswer = () => {
    setShowModel(true);
  };

  const handleRate = useCallback(async (rating: number) => {
    setSelfRating(rating);
    setSubmitted(true);

    // Save attempt
    await db.explanationAttempts.add({
      explanationId: explanation.id,
      userAnswer: userAnswer.trim(),
      selfRating: rating,
      completedAt: new Date().toISOString(),
    });

    // XP
    const xp = getExplanationXP(rating);
    const activity = await getOrCreateTodayActivity();
    await db.dailyActivity.update(activity.id!, {
      explanationsWritten: activity.explanationsWritten + 1,
      xpEarned: activity.xpEarned + xp,
    });

    // Update SM-2 for this flashcard
    const quality = Math.max(0, Math.min(5, rating));
    const existing = await db.flashcardReviews.where('flashcardId').equals(explanation.id).first();
    const prev = existing ?? {
      easinessFactor: SM2_DEFAULTS.easinessFactor,
      intervalDays: SM2_DEFAULTS.intervalDays,
      repetitions: SM2_DEFAULTS.repetitions,
    };
    const result = calculateSM2(quality, prev.easinessFactor, prev.intervalDays, prev.repetitions);
    const now = new Date().toISOString();

    if (existing) {
      await db.flashcardReviews.update(existing.id!, {
        ...result, lastReviewed: now,
      });
    } else {
      await db.flashcardReviews.add({
        flashcardId: explanation.id, ...result, lastReviewed: now,
      });
    }
  }, [explanation.id, userAnswer]);

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Prompt */}
      <Card variant="elevated" padding="lg">
        <div className="text-xs text-blue-400 font-medium mb-2 uppercase tracking-wider">{explanation.topic}</div>
        <p className="text-white text-base leading-relaxed">{explanation.prompt}</p>
      </Card>

      {/* Writing area */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-400">Twoje wyjaśnienie</span>
          <span className="text-xs text-slate-500">{userAnswer.length} / 50 min</span>
        </div>
        <textarea
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          placeholder="Napisz swoje wyjaśnienie..."
          className="w-full h-40 bg-slate-800/80 border border-slate-700/50 rounded-xl p-4 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500/50 transition-colors"
          disabled={showModel}
        />
      </div>

      {/* Show answer button */}
      {!showModel && (
        <Button
          onClick={handleShowAnswer}
          disabled={!canSubmit}
          fullWidth
        >
          Pokaż odpowiedź wzorcową
        </Button>
      )}

      {/* Model answer + comparison */}
      <AnimatePresence>
        {showModel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4"
          >
            <Card variant="outlined" className="border-l-4 border-l-emerald-500">
              <div className="text-xs text-emerald-400 font-medium mb-2 uppercase tracking-wider">Odpowiedź wzorcowa</div>
              <p className="text-sm text-slate-300 leading-relaxed">{explanation.modelAnswer}</p>
            </Card>

            {/* Self assessment */}
            {!submitted ? (
              <div>
                <p className="text-sm text-slate-400 mb-3 text-center">Oceń swoje wyjaśnienie (1-5)</p>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => handleRate(n)}
                      className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-lg hover:bg-blue-600 hover:border-blue-500 active:scale-95 transition-all"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-3">
                <p className="text-emerald-400 font-medium">
                  +{getExplanationXP(selfRating!)} XP (ocena: {selfRating}/5)
                </p>
                <Button onClick={onNext} fullWidth>Następne</Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
