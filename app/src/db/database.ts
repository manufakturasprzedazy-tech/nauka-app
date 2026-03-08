import Dexie, { type Table } from 'dexie';
import type { FlashcardReview, QuizAttempt, CodingAttempt, ExplanationAttempt, DailyActivity, UserSettings } from '@/types/progress';

export class LearningDatabase extends Dexie {
  flashcardReviews!: Table<FlashcardReview>;
  quizAttempts!: Table<QuizAttempt>;
  codingAttempts!: Table<CodingAttempt>;
  explanationAttempts!: Table<ExplanationAttempt>;
  dailyActivity!: Table<DailyActivity>;
  userSettings!: Table<UserSettings>;
  achievements!: Table<{ id: string; unlockedAt: string }>;

  constructor() {
    super('LearningDB');
    this.version(1).stores({
      flashcardReviews: '++id, flashcardId, nextReview',
      quizAttempts: '++id, questionId, completedAt',
      codingAttempts: '++id, exerciseId, completedAt',
      explanationAttempts: '++id, explanationId, completedAt',
      dailyActivity: '++id, &date',
      userSettings: '++id, &key',
      achievements: 'id, unlockedAt',
    });
  }
}

export const db = new LearningDatabase();

export async function getOrCreateTodayActivity(): Promise<DailyActivity> {
  const today = new Date().toISOString().split('T')[0];
  let activity = await db.dailyActivity.where('date').equals(today).first();
  if (!activity) {
    const id = await db.dailyActivity.add({
      date: today,
      flashcardsReviewed: 0,
      quizAnswered: 0,
      codingCompleted: 0,
      explanationsWritten: 0,
      xpEarned: 0,
    });
    activity = await db.dailyActivity.get(id);
  }
  return activity!;
}

export async function getSetting(key: string, defaultValue: string): Promise<string> {
  const setting = await db.userSettings.where('key').equals(key).first();
  return setting?.value ?? defaultValue;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const existing = await db.userSettings.where('key').equals(key).first();
  if (existing) {
    await db.userSettings.update(existing.id!, { value });
  } else {
    await db.userSettings.add({ key, value });
  }
}
