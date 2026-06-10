import { useEffect, useState } from 'react';
import { db } from '@/db/database';
import { useContentStore } from '@/stores/contentStore';
import type { Material } from '@/types/content';

export interface MaterialProgress {
  material: Material;
  done: number;
  total: number;
  percent: number; // 0-1
}

/** Per-material progress for a course (lesson read + flashcards + quiz + coding), derived from Dexie */
export function useMaterialProgress(courseId: string | undefined) {
  const [progressList, setProgressList] = useState<MaterialProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const { getMaterialsByCourse, getFlashcardsByMaterial, getQuizzesByMaterial, getExercisesByMaterial } = useContentStore();

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    const materials = getMaterialsByCourse(courseId);

    Promise.all([
      db.flashcardReviews.toArray(),
      db.quizAttempts.toArray(),
      db.codingAttempts.toArray(),
      db.userSettings.toArray(),
    ]).then(([reviews, quizAttempts, codingAttempts, settings]) => {
      if (cancelled) return;
      const reviewedIds = new Set(reviews.map(r => r.flashcardId));
      const answeredIds = new Set(quizAttempts.map(a => a.questionId));
      const codedIds = new Set(codingAttempts.filter(a => a.completed).map(a => a.exerciseId));
      const readLessons = new Set(
        settings.filter(s => s.key.startsWith('lesson_read_') && s.value === '1').map(s => Number(s.key.slice('lesson_read_'.length))),
      );

      const list = materials.map(material => {
        const flashcards = getFlashcardsByMaterial(material.id);
        const quizzes = getQuizzesByMaterial(material.id);
        const exercises = getExercisesByMaterial(material.id);

        const hasLesson = !!material.notes;
        let done = 0;
        let total = flashcards.length + quizzes.length + exercises.length + (hasLesson ? 1 : 0);
        if (hasLesson && readLessons.has(material.id)) done += 1;
        done += flashcards.filter(f => reviewedIds.has(f.id)).length;
        done += quizzes.filter(q => answeredIds.has(q.id)).length;
        done += exercises.filter(e => codedIds.has(e.id)).length;
        if (total === 0) total = 1;

        return { material, done, total, percent: done / total };
      });

      setProgressList(list);
      setLoading(false);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  return { progressList, loading };
}
