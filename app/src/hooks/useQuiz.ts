import { useState, useCallback } from 'react';
import { db, getOrCreateTodayActivity } from '@/db/database';
import { XP, getComboBonus } from '@/services/gamification';
import { useSessionStore } from '@/stores/sessionStore';
import { awardXP, awardBonusXP } from '@/services/xpService';
import { reportQuestEvent } from '@/services/questService';
import { checkProgressEvents, registerPerfectQuiz } from '@/services/achievementService';
import type { QuizQuestion } from '@/types/content';
import { shuffleArray } from '@/utils/formatters';

interface QuizState {
  questions: QuizQuestion[];
  currentIndex: number;
  answers: (number | null)[];
  showExplanation: boolean;
  finished: boolean;
  score: number;
  xpEarned: number;
  lastXP: { amount: number; bonus: number } | null;
}

export function useQuiz() {
  const [state, setState] = useState<QuizState>({
    questions: [],
    currentIndex: 0,
    answers: [],
    showExplanation: false,
    finished: false,
    score: 0,
    xpEarned: 0,
    lastXP: null,
  });

  const startQuiz = useCallback((questions: QuizQuestion[], count?: number) => {
    const shuffled = shuffleArray(questions);
    const selected = shuffled.slice(0, count ?? shuffled.length);
    useSessionStore.getState().resetCombo();
    setState({
      questions: selected,
      currentIndex: 0,
      answers: new Array(selected.length).fill(null),
      showExplanation: false,
      finished: false,
      score: 0,
      xpEarned: 0,
      lastXP: null,
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

    // Combo + XP for correct answer.
    // Base 10 XP pays only for the FIRST correct answer to this question today;
    // combo bonus (+1..+5, additive) pays only when the base paid (no farming).
    const combo = useSessionStore.getState().registerAnswer(isCorrect);
    let lastXP: QuizState['lastXP'] = null;

    if (isCorrect) {
      const base = await awardXP('quiz', q.id, XP.QUIZ_CORRECT);
      let bonus = 0;
      if (base > 0) {
        bonus = await awardBonusXP(getComboBonus(combo));
      }
      const xp = base + bonus;
      if (xp > 0) lastXP = { amount: xp, bonus };

      await reportQuestEvent('quiz_correct');
      if (combo >= 2) await reportQuestEvent('combo', combo);
    }

    // quizAnswered counts every answered question (the daily goal says "answer", not "ace")
    const activity = await getOrCreateTodayActivity();
    await db.dailyActivity.update(activity.id!, {
      quizAnswered: activity.quizAnswered + 1,
    });
    await checkProgressEvents();

    setState(s => ({
      ...s,
      answers: newAnswers,
      showExplanation: true,
      score: s.score + (isCorrect ? 1 : 0),
      xpEarned: s.xpEarned + (lastXP?.amount ?? 0),
      lastXP,
    }));
  }, [state.questions, state.currentIndex, state.answers]);

  const next = useCallback(() => {
    setState(s => {
      const nextIndex = s.currentIndex + 1;
      if (nextIndex >= s.questions.length) {
        // Session finished — perfect-quiz tracking (min 5 questions)
        if (s.questions.length >= 5 && s.score === s.questions.length) {
          reportQuestEvent('perfect_quiz');
          registerPerfectQuiz();
        }
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
