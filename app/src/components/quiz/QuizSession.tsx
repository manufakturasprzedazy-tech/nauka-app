import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
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
  return (
    <div className="px-4 py-4 space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400 whitespace-nowrap">
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
            <p className="text-white text-base leading-relaxed font-medium">{question.question}</p>
          </Card>

          {/* Choices */}
          <div className="mt-4 space-y-2">
            {question.choices.map((choice, i) => {
              const isSelected = selectedAnswer === i;
              const isRight = i === question.correctIndex;
              let bg = 'bg-slate-800/80 border-slate-700/50';
              if (showExplanation) {
                if (isRight) bg = 'bg-emerald-900/40 border-emerald-500/50';
                else if (isSelected && !isRight) bg = 'bg-red-900/40 border-red-500/50';
              } else if (isSelected) {
                bg = 'bg-blue-900/40 border-blue-500/50';
              }

              return (
                <button
                  key={i}
                  onClick={() => !showExplanation && onAnswer(i)}
                  disabled={showExplanation}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border transition-all',
                    bg,
                    !showExplanation && 'active:scale-[0.98]',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className={cn(
                      'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold',
                      showExplanation && isRight ? 'bg-emerald-500 text-white' :
                      showExplanation && isSelected ? 'bg-red-500 text-white' :
                      'bg-slate-700 text-slate-300'
                    )}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-slate-200 text-sm leading-relaxed">{choice}</span>
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
                  isCorrect ? 'border-l-emerald-500' : 'border-l-red-500'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('text-sm font-bold', isCorrect ? 'text-emerald-400' : 'text-red-400')}>
                    {isCorrect ? 'Poprawnie!' : 'Niepoprawnie'}
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{question.explanation}</p>
              </Card>
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
