import { useState, useEffect, useCallback } from 'react';
import { db, getOrCreateTodayActivity } from '@/db/database';
import { useContentStore } from '@/stores/contentStore';
import { calculateSM2, buttonToQuality, SM2_DEFAULTS } from '@/services/sm2';
import { XP } from '@/services/gamification';
import type { Flashcard } from '@/types/content';
import type { FlashcardReview } from '@/types/progress';
import { todayString } from '@/utils/formatters';

export function useFlashcards(courseId?: string, materialId?: number) {
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [newCards, setNewCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewCount, setReviewCount] = useState(0);
  const store = useContentStore();

  const loadCards = useCallback(async () => {
    setLoading(true);
    const today = todayString();

    // Get all flashcards based on filter
    let allCards: Flashcard[];
    if (materialId) {
      allCards = store.getFlashcardsByMaterial(materialId);
    } else if (courseId) {
      allCards = store.getFlashcardsByCourse(courseId);
    } else {
      allCards = store.flashcards;
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

    setDueCards(due);
    setNewCards(fresh);
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
    }

    // Award XP
    let xp = XP.FLASHCARD_BASE;
    if (rating === 'easy' && (!existing || existing.repetitions === 0)) {
      xp += XP.FLASHCARD_EASY_BONUS;
    }

    const activity = await getOrCreateTodayActivity();
    await db.dailyActivity.update(activity.id!, {
      flashcardsReviewed: activity.flashcardsReviewed + 1,
      xpEarned: activity.xpEarned + xp,
    });

    setReviewCount(c => c + 1);

    // Check first flashcard achievement
    const totalReviews = await db.flashcardReviews.count();
    if (totalReviews === 1) {
      const exists = await db.achievements.get('first_flashcard');
      if (!exists) {
        await db.achievements.add({ id: 'first_flashcard', unlockedAt: now });
      }
    }

    return xp;
  }, []);

  return { dueCards, newCards, loading, reviewCard, reviewCount, reload: loadCards };
}
