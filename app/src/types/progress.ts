export interface FlashcardReview {
  id?: number;
  flashcardId: number;
  easinessFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReview: string; // ISO date string
  lastReviewed: string; // ISO datetime string
}

export interface QuizAttempt {
  id?: number;
  questionId: number;
  selectedIndex: number;
  isCorrect: boolean;
  completedAt: string;
}

export interface CodingAttempt {
  id?: number;
  exerciseId: number;
  userCode: string;
  completed: boolean;
  completedAt: string;
}

export interface ExplanationAttempt {
  id?: number;
  explanationId: number;
  userAnswer: string;
  selfRating: number; // 1-5
  completedAt: string;
}

export interface DailyActivity {
  id?: number;
  date: string; // YYYY-MM-DD
  flashcardsReviewed: number;
  quizAnswered: number;
  codingCompleted: number;
  explanationsWritten: number;
  xpEarned: number;
}

export interface UserSettings {
  id?: number;
  key: string;
  value: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export type Level = 'Junior' | 'Regular' | 'Senior' | 'Lead' | 'Architect';
