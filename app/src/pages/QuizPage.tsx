import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { QuizSession } from '@/components/quiz/QuizSession';
import { QuizResults } from '@/components/quiz/QuizResults';
import { useQuiz } from '@/hooks/useQuiz';
import { useContentStore } from '@/stores/contentStore';
import type { QuizQuestion } from '@/types/content';

export function QuizPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const materialId = searchParams.get('material') ? Number(searchParams.get('material')) : undefined;
  const courseId = searchParams.get('course') ?? undefined;

  const store = useContentStore();
  const quiz = useQuiz();
  const [started, setStarted] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [questionCount, setQuestionCount] = useState(10);

  // Get available questions
  let availableQuestions: QuizQuestion[];
  if (materialId) {
    availableQuestions = store.getQuizzesByMaterial(materialId);
  } else if (courseId) {
    availableQuestions = store.getQuizzesByCourse(courseId);
  } else {
    availableQuestions = store.quizzes;
  }

  if (selectedDifficulty !== 'all') {
    availableQuestions = availableQuestions.filter(q => q.difficulty === selectedDifficulty);
  }

  const handleStart = () => {
    quiz.startQuiz(availableQuestions, questionCount);
    setStarted(true);
  };

  // Launcher
  if (!started) {
    return (
      <div>
        <Header title="Quiz" showBack />
        <div className="px-4 py-6 space-y-6">
          <div className="text-center">
            <div className="text-5xl mb-4">❓</div>
            <h2 className="text-xl font-bold text-white mb-2">Quiz</h2>
            <p className="text-slate-400 text-sm">{availableQuestions.length} pytań dostępnych</p>
          </div>

          {/* Difficulty filter */}
          <Card variant="outlined">
            <p className="text-sm text-slate-400 mb-2">Poziom trudności</p>
            <div className="flex gap-2">
              {[
                { val: 'all', label: 'Wszystkie' },
                { val: 'easy', label: 'Łatwe' },
                { val: 'medium', label: 'Średnie' },
                { val: 'hard', label: 'Trudne' },
              ].map(d => (
                <button
                  key={d.val}
                  onClick={() => setSelectedDifficulty(d.val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedDifficulty === d.val ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Question count */}
          <Card variant="outlined">
            <p className="text-sm text-slate-400 mb-2">Liczba pytań</p>
            <div className="flex gap-2">
              {[5, 10, 15, 20].map(n => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    questionCount === n ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </Card>

          <Button
            onClick={handleStart}
            disabled={availableQuestions.length === 0}
            fullWidth
            size="lg"
          >
            Rozpocznij quiz
          </Button>
        </div>
      </div>
    );
  }

  // Results
  if (quiz.finished) {
    return (
      <div>
        <Header title="Wyniki" showBack />
        <QuizResults
          score={quiz.score}
          total={quiz.total}
          onRetry={handleStart}
          onBack={() => navigate(-1)}
        />
      </div>
    );
  }

  // Active quiz
  if (!quiz.currentQuestion) return null;

  return (
    <div>
      <Header title="Quiz" showBack />
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
