import { useState, useEffect, useCallback } from 'react';
import { db } from '@/db/database';
import { useContentStore } from '@/stores/contentStore';
import type { QuizQuestion } from '@/types/content';

export interface WrongAnswer {
  questionId: number;
  question: QuizQuestion;
  selectedIndex: number;
  completedAt: string;
  materialTitle: string;
}

export function useQuizReview() {
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const store = useContentStore();

  const load = useCallback(async () => {
    setLoading(true);
    const attempts = await db.quizAttempts
      .where('isCorrect')
      .equals(0) // Dexie stores booleans as 0/1
      .toArray();

    // Also get attempts where isCorrect is explicitly false
    const allAttempts = await db.quizAttempts.toArray();
    const wrongAttempts = allAttempts.filter(a => !a.isCorrect);

    // Deduplicate — keep latest attempt per questionId
    const latestByQuestion = new Map<number, typeof wrongAttempts[0]>();
    for (const attempt of wrongAttempts) {
      const existing = latestByQuestion.get(attempt.questionId);
      if (!existing || attempt.completedAt > existing.completedAt) {
        latestByQuestion.set(attempt.questionId, attempt);
      }
    }

    // Check if the question was later answered correctly
    const correctAttempts = allAttempts.filter(a => a.isCorrect);
    const correctByQuestion = new Map<number, string>();
    for (const a of correctAttempts) {
      const existing = correctByQuestion.get(a.questionId);
      if (!existing || a.completedAt > existing) {
        correctByQuestion.set(a.questionId, a.completedAt);
      }
    }

    // Build wrong answers list
    const result: WrongAnswer[] = [];
    for (const [questionId, attempt] of latestByQuestion) {
      // Skip if later answered correctly
      const correctAt = correctByQuestion.get(questionId);
      if (correctAt && correctAt > attempt.completedAt) continue;

      const question = store.quizzes.find(q => q.id === questionId);
      if (!question) continue;

      const material = store.materials.find(m => m.id === question.materialId);

      result.push({
        questionId,
        question,
        selectedIndex: attempt.selectedIndex,
        completedAt: attempt.completedAt,
        materialTitle: material?.title ?? 'Nieznany materiał',
      });
    }

    // Sort newest first
    result.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    setWrongAnswers(result);
    setLoading(false);
  }, [store.quizzes, store.materials]);

  useEffect(() => { load(); }, [load]);

  const getWrongByMaterial = (materialId: number) =>
    wrongAnswers.filter(w => w.question.materialId === materialId);

  const getWrongQuestions = (): QuizQuestion[] =>
    wrongAnswers.map(w => w.question);

  return { wrongAnswers, loading, reload: load, getWrongByMaterial, getWrongQuestions };
}
