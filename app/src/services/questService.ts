// Daily quests — 3 rotating missions per day with bonus XP.
// Selection is deterministic per date (seeded PRNG), stored in Dexie `dailyQuests`.

import { db, getOrCreateTodayActivity } from '@/db/database';
import { useCelebrationStore } from '@/stores/celebrationStore';
import { todayString } from '@/utils/formatters';
import type { DailyQuest } from '@/types/progress';

export type QuestEvent = 'flashcard' | 'quiz_correct' | 'xp' | 'coding' | 'combo' | 'perfect_quiz';

export interface QuestTemplate {
  id: string;
  event: QuestEvent;
  target: number;
  reward: number;
  icon: string;
  label: string;
}

export const QUEST_TEMPLATES: QuestTemplate[] = [
  { id: 'q_flash_10', event: 'flashcard', target: 10, reward: 20, icon: '🎴', label: 'Powtórz 10 fiszek' },
  { id: 'q_flash_15', event: 'flashcard', target: 15, reward: 30, icon: '🎴', label: 'Powtórz 15 fiszek' },
  { id: 'q_quiz_8', event: 'quiz_correct', target: 8, reward: 25, icon: '❓', label: 'Odpowiedz poprawnie na 8 pytań' },
  { id: 'q_quiz_12', event: 'quiz_correct', target: 12, reward: 35, icon: '❓', label: 'Odpowiedz poprawnie na 12 pytań' },
  { id: 'q_xp_100', event: 'xp', target: 100, reward: 25, icon: '⚡', label: 'Zdobądź 100 XP' },
  { id: 'q_xp_200', event: 'xp', target: 200, reward: 40, icon: '⚡', label: 'Zdobądź 200 XP' },
  { id: 'q_coding_1', event: 'coding', target: 1, reward: 25, icon: '💻', label: 'Ukończ ćwiczenie z kodu' },
  { id: 'q_coding_2', event: 'coding', target: 2, reward: 40, icon: '💻', label: 'Ukończ 2 ćwiczenia z kodu' },
  { id: 'q_combo_5', event: 'combo', target: 5, reward: 30, icon: '🔥', label: 'Osiągnij combo x5 w quizie' },
  { id: 'q_perfect', event: 'perfect_quiz', target: 1, reward: 40, icon: '⭐', label: 'Zalicz quiz bezbłędnie' },
];

export const ALL_QUESTS_BONUS = 50;

// Deterministic PRNG seeded from date string — same quests all day, new set tomorrow
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickDailyTemplates(date: string): QuestTemplate[] {
  let seed = 0;
  for (let i = 0; i < date.length; i++) seed = (seed * 31 + date.charCodeAt(i)) | 0;
  const rand = mulberry32(seed);
  const pool = [...QUEST_TEMPLATES];
  const picked: QuestTemplate[] = [];
  while (picked.length < 3 && pool.length > 0) {
    const idx = Math.floor(rand() * pool.length);
    const tpl = pool.splice(idx, 1)[0];
    // avoid two quests of the same event type
    if (picked.some(p => p.event === tpl.event)) continue;
    picked.push(tpl);
  }
  return picked;
}

export function getTemplate(questId: string): QuestTemplate | undefined {
  return QUEST_TEMPLATES.find(t => t.id === questId);
}

/** Create today's quests if missing; returns today's quest rows. */
export async function ensureTodayQuests(): Promise<DailyQuest[]> {
  const date = todayString();
  const existing = await db.dailyQuests.where('date').equals(date).toArray();
  if (existing.length > 0) return existing;

  const templates = pickDailyTemplates(date);
  for (const tpl of templates) {
    try {
      await db.dailyQuests.add({ date, questId: tpl.id, progress: 0, target: tpl.target, completed: false });
    } catch {
      // unique [date+questId] index makes concurrent double-init a no-op
    }
  }
  return db.dailyQuests.where('date').equals(date).toArray();
}

async function awardQuestXP(amount: number) {
  const activity = await getOrCreateTodayActivity();
  await db.dailyActivity.update(activity.id!, { xpEarned: activity.xpEarned + amount });
}

/**
 * Report a learning event; updates matching quests.
 * For 'combo' pass the current combo as amount (progress = max reached).
 * Quest reward XP is NOT re-reported as an 'xp' event (no recursion).
 */
export async function reportQuestEvent(event: QuestEvent, amount = 1): Promise<void> {
  const date = todayString();
  const quests = await db.dailyQuests.where('date').equals(date).toArray();
  if (quests.length === 0) return;

  let justCompleted = false;

  for (const quest of quests) {
    const tpl = getTemplate(quest.questId);
    if (!tpl || tpl.event !== event || quest.completed) continue;

    const progress = event === 'combo'
      ? Math.max(quest.progress, amount)
      : quest.progress + amount;
    const completed = progress >= quest.target;
    await db.dailyQuests.update(quest.id!, { progress: Math.min(progress, quest.target), completed });

    if (completed) {
      justCompleted = true;
      await awardQuestXP(tpl.reward);
      useCelebrationStore.getState().push({ type: 'quest', name: tpl.label, xp: tpl.reward });
    }
  }

  if (justCompleted) {
    const after = await db.dailyQuests.where('date').equals(date).toArray();
    if (after.length >= 3 && after.every(q => q.completed)) {
      await awardQuestXP(ALL_QUESTS_BONUS);
      useCelebrationStore.getState().push({ type: 'quest', name: 'Wszystkie questy dnia!', xp: ALL_QUESTS_BONUS });
    }
  }
}
