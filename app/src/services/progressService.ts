// "Started lessons" scoping — practice modes (flashcards/quiz/sprint/puzzle/coding)
// draw ONLY from lessons the user has actually touched (read the lesson or made
// any progress on its items). Mirrors Duolingo's Practice Hub: practice reinforces
// seen material, it never runs ahead of the course path.

import { db, getSetting } from '@/db/database';
import { useContentStore } from '@/stores/contentStore';

/**
 * Material ids that count as "started":
 * - lesson_read_<id> flag set, OR
 * - any flashcard review / quiz attempt / coding attempt on the lesson's items.
 * For a course with NO started lessons, its first lesson is included so a fresh
 * user always has something to practice.
 * When the 🔓 free-mode toggle is on, ALL materials are returned (explicit opt-in).
 */
export async function getStartedMaterialIds(): Promise<Set<number>> {
  const { courses, materials, flashcards, quizzes, exercises } = useContentStore.getState();

  const freeMode = await getSetting('path_free_mode', '0');
  if (freeMode === '1') {
    return new Set(materials.map(m => m.id));
  }

  const flashcardToMaterial = new Map(flashcards.map(f => [f.id, f.materialId]));
  const quizToMaterial = new Map(quizzes.map(q => [q.id, q.materialId]));
  const exerciseToMaterial = new Map(exercises.map(e => [e.id, e.materialId]));

  const [reviews, quizAttempts, codingAttempts, settings] = await Promise.all([
    db.flashcardReviews.toArray(),
    db.quizAttempts.toArray(),
    db.codingAttempts.toArray(),
    db.userSettings.toArray(),
  ]);

  const started = new Set<number>();
  for (const r of reviews) {
    const m = flashcardToMaterial.get(r.flashcardId);
    if (m !== undefined) started.add(m);
  }
  for (const a of quizAttempts) {
    const m = quizToMaterial.get(a.questionId);
    if (m !== undefined) started.add(m);
  }
  for (const c of codingAttempts) {
    const m = exerciseToMaterial.get(c.exerciseId);
    if (m !== undefined) started.add(m);
  }
  for (const s of settings) {
    if (s.key.startsWith('lesson_read_') && s.value === '1') {
      started.add(Number(s.key.slice('lesson_read_'.length)));
    }
  }

  // Fresh course → its first lesson is open for practice
  for (const course of courses) {
    const courseMaterials = materials.filter(m => m.courseId === course.id);
    if (courseMaterials.length > 0 && !courseMaterials.some(m => started.has(m.id))) {
      started.add(courseMaterials[0].id);
    }
  }

  return started;
}
