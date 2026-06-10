import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { FormattedText } from '@/components/ui/FormattedText';
import { ExplainButton } from '@/components/ui/ExplainButton';
import { sounds } from '@/services/soundService';
import { haptics } from '@/services/haptics';
import type { QuizQuestion } from '@/types/content';

interface QuizSessionProps {
  question: QuizQuestion;
  questionIndex: number;
  total: number;
  selectedAnswer: number | null;
  showExplanation: boolean;
  isCorrect: boolean | null;
  onAnswer: (index: number) => void;
  onNext: () => void;
}

export function QuizSession({
  question, questionIndex, total, selectedAnswer,
  showExplanation, isCorrect, onAnswer, onNext,
}: QuizSessionProps) {
  const playedFor = useRef<number | null>(null);

  useEffect(() => {
    if (showExplanation && isCorrect !== null && playedFor.current !== question.id) {
      playedFor.current = question.id;
      if (isCorrect) {
        sounds.success();
        haptics.success();
      } else {
        sounds.error();
        haptics.error();
      }
    }
  }, [showExplanation, isCorrect, question.id]);

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400 whitespace-nowrap tnum">
          {questionIndex + 1} / {total}
        </span>
        <ProgressBar value={(questionIndex + 1) / total} size="sm" />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          <Card variant="elevated" padding="lg">
            <FormattedText text={question.question} className="text-white text-base font-medium" />
          </Card>

          {/* Choices */}
          <div className="mt-4 space-y-2">
            {question.choices.map((choice, i) => {
              const isSelected = selectedAnswer === i;
              const isRight = i === question.correctIndex;
              let bg = 'bg-[#10101a] border-slate-400/15';
              if (showExplanation) {
                if (isRight) bg = 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_16px_rgba(16,185,129,0.15)]';
                else if (isSelected && !isRight) bg = 'bg-rose-500/10 border-rose-500/40';
                else bg = 'bg-[#10101a] border-slate-400/10 opacity-60';
              } else if (isSelected) {
                bg = 'bg-indigo-500/10 border-indigo-500/40';
              }

              return (
                <button
                  key={i}
                  onClick={() => {
                    if (!showExplanation) {
                      haptics.tap();
                      onAnswer(i);
                    }
                  }}
                  disabled={showExplanation}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border transition-all min-h-[52px]',
                    bg,
                    !showExplanation && 'active:scale-[0.98] active:border-indigo-500/30',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className={cn(
                      'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border',
                      showExplanation && isRight ? 'bg-emerald-500 border-emerald-400 text-white' :
                      showExplanation && isSelected ? 'bg-rose-500 border-rose-400 text-white' :
                      'bg-white/5 border-slate-400/20 text-slate-300'
                    )}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <FormattedText text={choice} className="text-slate-200 text-sm" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4"
            >
              <Card
                variant="outlined"
                className={cn(
                  'border-l-4',
                  isCorrect ? 'border-l-emerald-500 bg-emerald-500/5' : 'border-l-rose-500 bg-rose-500/5'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('text-sm font-bold', isCorrect ? 'text-emerald-400' : 'text-rose-400')}>
                    {isCorrect ? '✓ Poprawnie!' : '✗ Niepoprawnie'}
                  </span>
                </div>
                <FormattedText text={question.explanation} className="text-sm text-slate-300" />
              </Card>
              <div className="mt-3">
                <ExplainButton
                  content={`Pytanie: ${question.question}\n\nOdpowiedzi:\n${question.choices.map((c, i) => `${String.fromCharCode(65 + i)}) ${c}`).join('\n')}\n\nPoprawna: ${String.fromCharCode(65 + question.correctIndex)}) ${question.choices[question.correctIndex]}\n\nWyjaśnienie: ${question.explanation}`}
                  context="quiz"
                />
              </div>
              <Button onClick={onNext} fullWidth className="mt-4">
                Następne
              </Button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
