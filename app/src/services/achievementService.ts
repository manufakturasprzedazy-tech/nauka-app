// Central place that evaluates achievements, streak milestones and level-ups
// after any learning activity, and pushes celebrations to the queue.

import { db, getSetting, setSetting } from '@/db/database';
import { getLevel, XP } from '@/services/gamification';
import { awardXP } from '@/services/xpService';
import { useCelebrationStore } from '@/stores/celebrationStore';
import { useContentStore } from '@/stores/contentStore';
import { DEFAULT_GOAL } from '@/stores/appStore';
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
  const reviews = await db.flashcardReviews.toArray();
  if (reviews.length >= 1) await unlock('first_flashcard');
  if (reviews.length >= 100) await unlock('century');

  // --- Topic mastery: every card of some topic (≥6 cards) reviewed ≥2 times ---
  const { flashcards, materials } = useContentStore.getState();
  const repsByCard = new Map(reviews.map(r => [r.flashcardId, r.repetitions]));
  const cardsByTopic = new Map<string, number[]>();
  for (const f of flashcards) {
    const arr = cardsByTopic.get(f.topic) ?? [];
    arr.push(f.id);
    cardsByTopic.set(f.topic, arr);
  }
  for (const [, cardIds] of cardsByTopic) {
    if (cardIds.length >= 6 && cardIds.every(id => (repsByCard.get(id) ?? 0) >= 2)) {
      await unlock('topic_master');
      break;
    }
  }

  // --- MLOps course started ---
  const mlopsIds = new Set(materials.filter(m => m.courseId === 'mlops').map(m => m.id));
  if (mlopsIds.size > 0) {
    const settings = await db.userSettings.toArray();
    const readMlops = settings.some(
      s => s.key.startsWith('lesson_read_') && s.value === '1' && mlopsIds.has(Number(s.key.slice('lesson_read_'.length))),
    );
    const cardToMaterial = new Map(flashcards.map(f => [f.id, f.materialId]));
    const reviewedMlops = reviews.some(r => mlopsIds.has(cardToMaterial.get(r.flashcardId) ?? -1));
    if (readMlops || reviewedMlops) await unlock('mlops_starter');
  }

  // --- 10 lessons fully completed (lifetime lesson-complete awards) ---
  const lifetimeAwards = await db.xpAwards.where('date').equals('ever').toArray();
  if (lifetimeAwards.filter(a => a.kind === 'lesson').length >= 10) await unlock('marathoner');

  const codingDone = new Set(
    (await db.codingAttempts.toArray()).filter(a => a.completed).map(a => a.exerciseId),
  ).size;
  if (codingDone >= 5) await unlock('coder');
  if (codingDone >= 10) await unlock('debugger');

  // --- New-mode achievements (counters in userSettings) ---
  if (Number(await getSetting('sprint_correct_total', '0')) >= 50) await unlock('sprinter');
  if (Number(await getSetting('puzzles_solved', '0')) >= 10) await unlock('puzzle_master');

  // --- Daily goal bonus (+6 XP, once per day) ---
  try {
    const raw = await getSetting('daily_goal', '');
    const goal = raw ? { ...DEFAULT_GOAL, ...JSON.parse(raw) } : DEFAULT_GOAL;
    const today = all.find(a => a.date === todayString());
    if (
      today &&
      today.flashcardsReviewed >= goal.flashcards &&
      today.quizAnswered >= goal.quizzes &&
      today.codingCompleted >= goal.coding
    ) {
      const xp = await awardXP('daily_goal', 0, XP.DAILY_GOAL);
      if (xp > 0) push({ type: 'quest', name: 'Cel dzienny osiągnięty!', xp });
    }
  } catch {
    // corrupted goal setting — skip bonus
  }
}

/** Call when a quiz session ends with a perfect score. */
export async function registerPerfectQuiz(): Promise<void> {
  const count = Number(await getSetting('perfect_quizzes', '0')) + 1;
  await setSetting('perfect_quizzes', String(count));
  if (count >= 10) await unlock('quiz_ace');
}
