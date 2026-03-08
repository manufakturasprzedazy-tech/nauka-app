import { useState, useCallback } from 'react';
import { db, getOrCreateTodayActivity } from '@/db/database';
import { XP } from '@/services/gamification';
import type { QuizQuestion } from '@/types/content';
import { shuffleArray } from '@/utils/formatters';

interface QuizState {
  questions: QuizQuestion[];
  currentIndex: number;
  answers: (number | null)[];
  showExplanation: boolean;
  finished: boolean;
  score: number;
}

export function useQuiz() {
  const [state, setState] = useState<QuizState>({
    questions: [],
    currentIndex: 0,
    answers: [],
    showExplanation: false,
    finished: false,
    score: 0,
  });

  const startQuiz = useCallback((questions: QuizQuestion[], count?: number) => {
    const shuffled = shuffleArray(questions);
    const selected = shuffled.slice(0, count ?? shuffled.length);
    setState({
      questions: selected,
      currentIndex: 0,
      answers: new Array(selected.length).fill(null),
      showExplanation: false,
      finished: false,
      score: 0,
    });
  }, []);

  const answer = useCallback(async (selectedIndex: number) => {
    const q = state.questions[state.currentIndex];
    const isCorrect = selectedIndex === q.correctIndex;

    const newAnswers = [...state.answers];
    newAnswers[state.currentIndex] = selectedIndex;

    // Save attempt
    await db.quizAttempts.add({
      questionId: q.id,
      selectedIndex,
      isCorrect,
      completedAt: new Date().toISOString(),
    });

    // XP for correct answer
    if (isCorrect) {
      const activity = await getOrCreateTodayActivity();
      await db.dailyActivity.update(activity.id!, {
        quizAnswered: activity.quizAnswered + 1,
        xpEarned: activity.xpEarned + XP.QUIZ_CORRECT,
      });
    }

    setState(s => ({
      ...s,
      answers: newAnswers,
      showExplanation: true,
      score: s.score + (isCorrect ? 1 : 0),
    }));
  }, [state.questions, state.currentIndex, state.answers]);

  const next = useCallback(() => {
    setState(s => {
      const nextIndex = s.currentIndex + 1;
      if (nextIndex >= s.questions.length) {
        return { ...s, finished: true, showExplanation: false };
      }
      return { ...s, currentIndex: nextIndex, showExplanation: false };
    });
  }, []);

  const currentQuestion = state.questions[state.currentIndex] ?? null;
  const currentAnswer = state.answers[state.currentIndex];
  const isCorrect = currentAnswer !== null && currentQuestion ? currentAnswer === currentQuestion.correctIndex : null;

  return {
    ...state,
    currentQuestion,
    currentAnswer,
    isCorrect,
    startQuiz,
    answer,
    next,
    total: state.questions.length,
  };
}
