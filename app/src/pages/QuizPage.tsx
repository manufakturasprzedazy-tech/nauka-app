import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { QuizSession } from '@/components/quiz/QuizSession';
import { QuizResults } from '@/components/quiz/QuizResults';
import { ComboCounter } from '@/components/feedback/ComboCounter';
import { XPFloat, useXPFloat } from '@/components/feedback/XPFloat';
import { useQuiz } from '@/hooks/useQuiz';
import { useSessionStore } from '@/stores/sessionStore';
import { useContentStore } from '@/stores/contentStore';
import type { QuizQuestion } from '@/types/content';

export function QuizPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const materialId = searchParams.get('material') ? Number(searchParams.get('material')) : undefined;
  const courseId = searchParams.get('course') ?? undefined;

  const store = useContentStore();
  const quiz = useQuiz();
  const combo = useSessionStore(s => s.combo);
  const bestCombo = useSessionStore(s => s.bestCombo);
  const { items, spawn } = useXPFloat();
  const lastSpawnedRef = useRef<unknown>(null);
  const [started, setStarted] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [questionCount, setQuestionCount] = useState(10);

  // Spawn "+XP" float when a correct answer lands
  useEffect(() => {
    if (quiz.lastXP && quiz.lastXP !== lastSpawnedRef.current) {
      lastSpawnedRef.current = quiz.lastXP;
      spawn(quiz.lastXP.amount, quiz.lastXP.multiplier);
    }
  }, [quiz.lastXP, spawn]);

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

  const pill = (active: boolean) =>
    `px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border min-h-[40px] ${
      active
        ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_16px_rgba(99,102,241,0.35)]'
        : 'bg-white/[0.03] border-slate-400/10 text-slate-400'
    }`;

  // Launcher
  if (!started) {
    return (
      <div>
        <Header title="Quiz" showBack />
        <div className="px-4 py-6 space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 border border-emerald-500/25 text-4xl shadow-[0_0_24px_rgba(16,185,129,0.2)]">
              ❓
            </div>
            <h2 className="text-xl font-extrabold text-white mb-1">Quiz</h2>
            <p className="text-slate-400 text-sm tnum">{availableQuestions.length} pytań dostępnych</p>
          </div>

          {/* Difficulty filter */}
          <Card variant="default">
            <p className="text-sm text-slate-400 mb-2">Poziom trudności</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { val: 'all', label: 'Wszystkie' },
                { val: 'easy', label: 'Łatwe' },
                { val: 'medium', label: 'Średnie' },
                { val: 'hard', label: 'Trudne' },
              ].map(d => (
                <button key={d.val} onClick={() => setSelectedDifficulty(d.val)} className={pill(selectedDifficulty === d.val)}>
                  {d.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Question count */}
          <Card variant="default">
            <p className="text-sm text-slate-400 mb-2">Liczba pytań</p>
            <div className="flex gap-2">
              {[5, 10, 15, 20].map(n => (
                <button key={n} onClick={() => setQuestionCount(n)} className={pill(questionCount === n)}>
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
          xpEarned={quiz.xpEarned}
          bestCombo={bestCombo}
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
      <ComboCounter combo={combo} />
      <XPFloat items={items} />
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
