import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SimilarityFeedback } from './SimilarityFeedback';
import { db, getOrCreateTodayActivity, getSetting } from '@/db/database';
import { getExplanationXP } from '@/services/gamification';
import { calculateSimilarity, type SimilarityResult } from '@/services/textSimilarity';
import { evaluateExplanation } from '@/services/aiService';
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
  const [similarity, setSimilarity] = useState<SimilarityResult | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  const canSubmit = userAnswer.trim().length >= 50;

  useEffect(() => {
    getSetting('claude_api_key', '').then(key => {
      if (key) setApiKey(key);
    });
  }, []);

  const handleShowAnswer = () => {
    setShowModel(true);
    const result = calculateSimilarity(userAnswer, explanation.modelAnswer);
    setSimilarity(result);
  };

  const handleAICheck = async () => {
    if (!apiKey) return;
    setAiLoading(true);
    try {
      const result = await evaluateExplanation(
        explanation.prompt,
        explanation.modelAnswer,
        userAnswer,
        apiKey
      );
      setAiFeedback(result.feedback);
      if (result.score) {
        setSimilarity(prev => prev ? { ...prev, suggestedRating: result.score! } : prev);
      }
    } catch {
      setAiFeedback('Nie udało się połączyć z AI. Sprawdź klucz API.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleRate = useCallback(async (rating: number) => {
    setSelfRating(rating);
    setSubmitted(true);

    await db.explanationAttempts.add({
      explanationId: explanation.id,
      userAnswer: userAnswer.trim(),
      selfRating: rating,
      completedAt: new Date().toISOString(),
    });

    const xp = getExplanationXP(rating);
    const activity = await getOrCreateTodayActivity();
    await db.dailyActivity.update(activity.id!, {
      explanationsWritten: activity.explanationsWritten + 1,
      xpEarned: activity.xpEarned + xp,
    });

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
      await db.flashcardReviews.update(existing.id!, { ...result, lastReviewed: now });
    } else {
      await db.flashcardReviews.add({ flashcardId: explanation.id, ...result, lastReviewed: now });
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
        <Button onClick={handleShowAnswer} disabled={!canSubmit} fullWidth>
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

            {/* Similarity feedback */}
            {similarity && !submitted && (
              <SimilarityFeedback result={similarity} onSelectRating={handleRate} />
            )}

            {/* AI check button */}
            {apiKey && !submitted && !aiFeedback && (
              <Button
                variant="secondary"
                onClick={handleAICheck}
                disabled={aiLoading}
                fullWidth
                size="sm"
              >
                {aiLoading ? 'Sprawdzam z AI...' : 'Sprawdź z AI'}
              </Button>
            )}

            {/* AI feedback */}
            {aiFeedback && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card variant="outlined" className="border-l-4 border-l-violet-500">
                  <div className="text-xs text-violet-400 font-medium mb-2 uppercase tracking-wider">Feedback AI</div>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{aiFeedback}</p>
                </Card>
              </motion.div>
            )}

            {/* Submitted result */}
            {submitted && (
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
