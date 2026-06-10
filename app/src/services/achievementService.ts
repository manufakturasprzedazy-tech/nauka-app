// Central place that evaluates achievements, streak milestones and level-ups
// after any learning activity, and pushes celebrations to the queue.

import { db, getSetting, setSetting } from '@/db/database';
import { getLevel } from '@/services/gamification';
import { useCelebrationStore } from '@/stores/celebrationStore';
import { todayString } from '@/utils/formatters';

export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100];

async function unlock(id: string): Promise<boolean> {
  const exists = await db.achievements.get(id);
  if (exists) return false;
  await db.achievements.add({ id, unlockedAt: new Date().toISOString() });
  useCelebrationStore.getState().push({ type: 'achievement', id });
  return true;
}

async function calcStreak(): Promise<number> {
  const activities = await db.dailyActivity.toArray();
  const dateSet = new Set(
    activities
      .filter(a => a.flashcardsReviewed > 0 || a.quizAnswered > 0 || a.codingCompleted > 0 || a.explanationsWritten > 0)
      .map(a => a.date),
  );
  const today = todayString();
  const checkDate = new Date();
  if (!dateSet.has(today)) checkDate.setDate(checkDate.getDate() - 1);
  let count = 0;
  for (;;) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (!dateSet.has(dateStr)) break;
    count++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return count;
}

/** Call after any XP-earning activity. Cheap (a few IndexedDB reads). */
export async function checkProgressEvents(): Promise<void> {
  const push = useCelebrationStore.getState().push;

  // --- Level up ---
  const all = await db.dailyActivity.toArray();
  const totalXP = all.reduce((s, a) => s + a.xpEarned, 0);
  const level = getLevel(totalXP);
  // Map pre-rebrand level names so the rename doesn't fire a fake level-up
  const LEGACY: Record<string, string> = {
    Junior: 'Skrypciarz', Regular: 'Pythonista', Senior: 'Automatyk', Lead: 'ML Engineer', Architect: 'MLOps Architect',
  };
  let lastLevel = await getSetting('last_level', 'Skrypciarz');
  if (LEGACY[lastLevel]) lastLevel = LEGACY[lastLevel];
  if (level !== lastLevel) {
    await setSetting('last_level', level);
    if (lastLevel !== 'Skrypciarz' || level !== 'Skrypciarz') {
      push({ type: 'levelup', level });
    }
  }

  // --- Streak milestones ---
  const streak = await calcStreak();
  const lastMilestone = Number(await getSetting('last_streak_milestone', '0'));
  const reached = STREAK_MILESTONES.filter(m => streak >= m).pop() ?? 0;
  if (reached > lastMilestone) {
    await setSetting('last_streak_milestone', String(reached));
    push({ type: 'streak', days: reached });
  }
  if (streak >= 7) await unlock('streak_7');
  if (streak >= 30) await unlock('streak_30');

  // --- Counting achievements ---
  const reviewCount = await db.flashcardReviews.count();
  if (reviewCount >= 1) await unlock('first_flashcard');
  if (reviewCount >= 100) await unlock('century');

  const codingDone = new Set(
    (await db.codingAttempts.toArray()).filter(a => a.completed).map(a => a.exerciseId),
  ).size;
  if (codingDone >= 5) await unlock('coder');
  if (codingDone >= 10) await unlock('debugger');

  // --- New-mode achievements (counters in userSettings) ---
  if (Number(await getSetting('sprint_correct_total', '0')) >= 50) await unlock('sprinter');
  if (Number(await getSetting('puzzles_solved', '0')) >= 10) await unlock('puzzle_master');
}

/** Call when a quiz session ends with a perfect score. */
export async function registerPerfectQuiz(): Promise<void> {
  const count = Number(await getSetting('perfect_quizzes', '0')) + 1;
  await setSetting('perfect_quizzes', String(count));
  if (count >= 10) await unlock('quiz_ace');
}
