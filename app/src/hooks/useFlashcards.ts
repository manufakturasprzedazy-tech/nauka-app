import { useState, useEffect, useCallback } from 'react';
import { db, getOrCreateTodayActivity, getSetting, setSetting } from '@/db/database';
import { useContentStore } from '@/stores/contentStore';
import { calculateSM2, buttonToQuality, SM2_DEFAULTS } from '@/services/sm2';
import { XP } from '@/services/gamification';
import { awardXP } from '@/services/xpService';
import { getStartedMaterialIds } from '@/services/progressService';
import { reportQuestEvent } from '@/services/questService';
import { checkProgressEvents } from '@/services/achievementService';
import type { Flashcard } from '@/types/content';
import type { FlashcardReview } from '@/types/progress';
import { todayString } from '@/utils/formatters';

// Session design per SRS research: 10 new cards/day keeps the review debt
// sustainable for a beginner (~20 min/day); 100 reviews caps a session.
export const NEW_CARDS_PER_DAY = 10;
export const MAX_REVIEWS_PER_SESSION = 100;

async function getNewCardsStartedToday(): Promise<number> {
  return Number(await getSetting(`new_cards_${todayString()}`, '0'));
}

export function useFlashcards(courseId?: string, materialId?: number) {
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [newCards, setNewCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewCount, setReviewCount] = useState(0);
  const store = useContentStore();

  const loadCards = useCallback(async () => {
    setLoading(true);
    const today = todayString();

    // Get all flashcards based on filter; with no explicit filter,
    // practice draws only from started lessons
    let allCards: Flashcard[];
    if (materialId) {
      allCards = store.getFlashcardsByMaterial(materialId);
    } else if (courseId) {
      allCards = store.getFlashcardsByCourse(courseId);
    } else {
      const started = await getStartedMaterialIds();
      allCards = store.flashcards.filter(f => started.has(f.materialId));
    }

    // Get existing reviews
    const reviews = await db.flashcardReviews.toArray();
    const reviewMap = new Map<number, FlashcardReview>();
    reviews.forEach(r => reviewMap.set(r.flashcardId, r));

    const due: Flashcard[] = [];
    const fresh: Flashcard[] = [];

    for (const card of allCards) {
      const review = reviewMap.get(card.id);
      if (!review) {
        fresh.push(card);
      } else if (review.nextReview <= today) {
        due.push(card);
      }
    }

    // Daily new-card budget + session review cap
    const newToday = await getNewCardsStartedToday();
    const newBudget = Math.max(0, NEW_CARDS_PER_DAY - newToday);

    setDueCards(due.slice(0, MAX_REVIEWS_PER_SESSION));
    setNewCards(fresh.slice(0, newBudget));
    setLoading(false);
  }, [courseId, materialId, store]);

  useEffect(() => { loadCards(); }, [loadCards]);

  const reviewCard = useCallback(async (
    flashcardId: number,
    rating: 'again' | 'hard' | 'good' | 'easy'
  ) => {
    const quality = buttonToQuality(rating);
    const existing = await db.flashcardReviews.where('flashcardId').equals(flashcardId).first();

    const prev = existing ?? {
      easinessFactor: SM2_DEFAULTS.easinessFactor,
      intervalDays: SM2_DEFAULTS.intervalDays,
      repetitions: SM2_DEFAULTS.repetitions,
    };

    const result = calculateSM2(quality, prev.easinessFactor, prev.intervalDays, prev.repetitions);
    const now = new Date().toISOString();

    if (existing) {
      await db.flashcardReviews.update(existing.id!, {
        easinessFactor: result.easinessFactor,
        intervalDays: result.intervalDays,
        repetitions: result.repetitions,
        nextReview: result.nextReview,
        lastReviewed: now,
      });
    } else {
      await db.flashcardReviews.add({
        flashcardId,
        easinessFactor: result.easinessFactor,
        intervalDays: result.intervalDays,
        repetitions: result.repetitions,
        nextReview: result.nextReview,
        lastReviewed: now,
      });
      // Count against today's new-card budget
      const today = todayString();
      const count = Number(await getSetting(`new_cards_${today}`, '0'));
      await setSetting(`new_cards_${today}`, String(count + 1));
    }

    // XP: only a correct recall pays, once per card per day, capped daily.
    // "Nie pamiętam" = 0 XP (the card re-enters the session queue instead).
    let xp = 0;
    if (rating === 'good' || rating === 'easy') {
      xp = await awardXP('flashcard', flashcardId, XP.FLASHCARD_PASS);
    } else if (rating === 'hard') {
      xp = await awardXP('flashcard', flashcardId, XP.FLASHCARD_HARD);
    }

    const activity = await getOrCreateTodayActivity();
    await db.dailyActivity.update(activity.id!, {
      flashcardsReviewed: activity.flashcardsReviewed + 1,
    });

    setReviewCount(c => c + 1);

    await reportQuestEvent('flashcard');
    await checkProgressEvents();

    return xp;
  }, []);

  return { dueCards, newCards, loading, reviewCard, reviewCount, reload: loadCards };
}
