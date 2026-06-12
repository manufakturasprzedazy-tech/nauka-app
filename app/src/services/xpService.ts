// Anti-farming XP ledger. Every award is recorded in `xpAwards` with a unique
// [date+kind+itemId] index — the same item can pay XP at most once per day
// (or once per lifetime for kind 'lesson'). Design per research spec:
// XP tracks real progress, repeats pay nothing, failures pay nothing.

import { db, getOrCreateTodayActivity } from '@/db/database';
import { reportQuestEvent } from '@/services/questService';
import { todayString } from '@/utils/formatters';

export type XPKind = 'flashcard' | 'quiz' | 'coding' | 'puzzle' | 'lesson' | 'daily_goal';

const FLASHCARD_DAILY_CAP = 100;

/**
 * Award XP for an item. Returns the amount actually granted
 * (0 when this item already paid today / cap reached).
 */
export async function awardXP(
  kind: XPKind,
  itemId: number,
  amount: number,
  opts?: { oncePerLifetime?: boolean },
): Promise<number> {
  if (amount <= 0) return 0;
  const date = opts?.oncePerLifetime ? 'ever' : todayString();

  // Daily cap for flashcards (100 XP ≈ 20 paid passes) — partial fill near the limit
  if (kind === 'flashcard') {
    const todayAwards = await db.xpAwards.where('date').equals(todayString()).toArray();
    const flashcardXP = todayAwards.filter(a => a.kind === 'flashcard').reduce((s, a) => s + a.amount, 0);
    amount = Math.min(amount, FLASHCARD_DAILY_CAP - flashcardXP);
    if (amount <= 0) return 0;
  }

  try {
    await db.xpAwards.add({ date, kind, itemId, amount });
  } catch {
    // unique index violation — this item already paid in this window
    return 0;
  }

  const activity = await getOrCreateTodayActivity();
  await db.dailyActivity.update(activity.id!, { xpEarned: activity.xpEarned + amount });
  await reportQuestEvent('xp', amount);
  return amount;
}

/** Un-deduplicated bonus XP (combo bonuses etc.) — tied to an awarded base, so not farmable on its own. */
export async function awardBonusXP(amount: number): Promise<number> {
  if (amount <= 0) return 0;
  const activity = await getOrCreateTodayActivity();
  await db.dailyActivity.update(activity.id!, { xpEarned: activity.xpEarned + amount });
  await reportQuestEvent('xp', amount);
  return amount;
}

/** Has this item already paid XP today (or ever, for lifetime kinds)? */
export async function alreadyAwarded(kind: XPKind, itemId: number, lifetime = false): Promise<boolean> {
  const date = lifetime ? 'ever' : todayString();
  const hit = await db.xpAwards.where('[date+kind+itemId]').equals([date, kind, itemId]).first();
  return !!hit;
}
