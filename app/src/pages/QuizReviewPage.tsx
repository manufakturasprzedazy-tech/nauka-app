import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FormattedText } from '@/components/ui/FormattedText';
import { QuizSession } from '@/components/quiz/QuizSession';
import { QuizResults } from '@/components/quiz/QuizResults';
import { useQuizReview } from '@/hooks/useQuizReview';
import { useQuiz } from '@/hooks/useQuiz';
import { useContentStore } from '@/stores/contentStore';
import { cn } from '@/utils/cn';

export function QuizReviewPage() {
  const { wrongAnswers, loading, reload } = useQuizReview();
  const quiz = useQuiz();
  const store = useContentStore();
  const navigate = useNavigate();
  const [selectedMaterial, setSelectedMaterial] = useState<number | null>(null);
  const [retrying, setRetrying] = useState(false);

  // Get unique materials from wrong answers
  const materials = [...new Set(wrongAnswers.map(w => w.question.materialId))].map(id => {
    const mat = store.materials.find(m => m.id === id);
    const count = wrongAnswers.filter(w => w.question.materialId === id).length;
    return { id, title: mat?.title ?? 'Nieznany', count };
  });

  const filtered = selectedMaterial
    ? wrongAnswers.filter(w => w.question.materialId === selectedMaterial)
    : wrongAnswers;

  const handleRetry = () => {
    const questions = filtered.map(w => w.question);
    quiz.startQuiz(questions, questions.length);
    setRetrying(true);
  };

  if (loading) {
    return (
      <div>
        <Header title="Powtórka błędów" showBack />
        <div className="flex items-center justify-center h-64 text-slate-400">Ładowanie...</div>
      </div>
    );
  }

  // Active retry quiz
  if (retrying && !quiz.finished && quiz.currentQuestion) {
    return (
      <div>
        <Header title="Powtórka błędów" showBack />
        <QuizSession
          question={quiz.currentQuestion}
          questionIndex={quiz.currentIndex}
          total={quiz.total}
          selectedAnswer={quiz.currentAnswer}
          showExplanation={quiz.showExplanation}
          isCorrect={quiz.isCorrect}
          onAnswer={quiz.answer}
          onNext={quiz.next}
        />
      </div>
    );
  }

  // Retry finished
  if (retrying && quiz.finished) {
    return (
      <div>
        <Header title="Wyniki powtórki" showBack />
        <QuizResults
          score={quiz.score}
          total={quiz.total}
          onRetry={handleRetry}
          onBack={() => { setRetrying(false); reload(); }}
        />
      </div>
    );
  }

  return (
    <div>
      <Header title="Powtórka błędów" showBack />
      <div className="px-4 py-4 space-y-4">
        {wrongAnswers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-white mb-2">Brak błędów!</h2>
            <p className="text-slate-400 text-sm">Wszystkie pytania odpowiedziane poprawnie.</p>
            <Button onClick={() => navigate('/quiz')} className="mt-6">
              Idź do quizu
            </Button>
          </div>
        ) : (
          <>
            {/* Summary */}
            <Card variant="elevated" padding="lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-400">{wrongAnswers.length}</div>
                  <div className="text-xs text-slate-400">błędnych pytań</div>
                </div>
                <Button onClick={handleRetry} size="sm">
                  Powtórz błędne ({filtered.length})
                </Button>
              </div>
            </Card>

            {/* Material filter */}
            {materials.length > 1 && (
              <div className="flex overflow-x-auto gap-1 no-scrollbar">
                <button
                  onClick={() => setSelectedMaterial(null)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                    !selectedMaterial ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400',
                  )}
                >
                  Wszystkie ({wrongAnswers.length})
                </button>
                {materials.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMaterial(m.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                      selectedMaterial === m.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400',
                    )}
                  >
                    {m.title} ({m.count})
                  </button>
                ))}
              </div>
            )}

            {/* Wrong answers list */}
            <div className="space-y-3">
              {filtered.map((wa, i) => (
                <motion.div
                  key={wa.questionId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card variant="default">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={
                        wa.question.difficulty === 'easy' ? 'success' :
                        wa.question.difficulty === 'medium' ? 'warning' : 'danger'
                      } size="sm">{wa.question.difficulty}</Badge>
                      <span className="text-xs text-slate-500">{wa.materialTitle}</span>
                    </div>

                    <FormattedText text={wa.question.question} className="text-sm text-white mb-3" />

                    {/* User's wrong answer */}
                    <div className="p-2 rounded-lg bg-red-900/20 border border-red-800/30 mb-2">
                      <span className="text-xs text-red-400 block mb-1">Twoja odpowiedź</span>
                      <span className="text-sm text-red-300">
                        {String.fromCharCode(65 + wa.selectedIndex)}. {wa.question.choices[wa.selectedIndex]}
                      </span>
                    </div>

                    {/* Correct answer */}
                    <div className="p-2 rounded-lg bg-emerald-900/20 border border-emerald-800/30">
                      <span className="text-xs text-emerald-400 block mb-1">Poprawna odpowiedź</span>
                      <span className="text-sm text-emerald-300">
                        {String.fromCharCode(65 + wa.question.correctIndex)}. {wa.question.choices[wa.question.correctIndex]}
                      </span>
                    </div>

                    {/* Explanation */}
                    {wa.question.explanation && (
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">{wa.question.explanation}</p>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
