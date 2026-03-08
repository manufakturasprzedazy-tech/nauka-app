import type { Level } from '@/types/progress';

// XP rewards
export const XP = {
  FLASHCARD_BASE: 5,
  FLASHCARD_EASY_BONUS: 3,
  QUIZ_CORRECT: 10,
  CODING_COMPLETE: 25,
  EXPLANATION_BASE: 15,
} as const;

// Level thresholds
const LEVEL_THRESHOLDS: { level: Level; minXP: number }[] = [
  { level: 'Junior', minXP: 0 },
  { level: 'Regular', minXP: 500 },
  { level: 'Senior', minXP: 2000 },
  { level: 'Lead', minXP: 5000 },
  { level: 'Architect', minXP: 10000 },
];

export function getLevel(totalXP: number): Level {
  let current: Level = 'Junior';
  for (const t of LEVEL_THRESHOLDS) {
    if (totalXP >= t.minXP) current = t.level;
  }
  return current;
}

export function getLevelProgress(totalXP: number): { level: Level; current: number; nextThreshold: number; progress: number } {
  const level = getLevel(totalXP);
  const idx = LEVEL_THRESHOLDS.findIndex(t => t.level === level);
  const currentThreshold = LEVEL_THRESHOLDS[idx].minXP;
  const nextThreshold = idx < LEVEL_THRESHOLDS.length - 1 ? LEVEL_THRESHOLDS[idx + 1].minXP : currentThreshold + 5000;
  const progress = (totalXP - currentThreshold) / (nextThreshold - currentThreshold);

  return { level, current: totalXP, nextThreshold, progress: Math.min(1, progress) };
}

export function getCodingXP(score: number): number {
  if (score >= 4) return 25;
  if (score === 3) return 15;
  if (score === 2) return 10;
  return 5;
}

export function getExplanationXP(selfRating: number): number {
  // Scale XP by self-rating (1-5)
  return Math.round(XP.EXPLANATION_BASE * (selfRating / 5));
}

// Achievement definitions
export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_flashcard', name: 'Pierwsza fiszka', description: 'Powtórz pierwszą fiszkę', icon: '🎴' },
  { id: 'streak_7', name: '7-dniowy streak', description: 'Ucz się przez 7 dni z rzędu', icon: '🔥' },
  { id: 'streak_30', name: '30-dniowy streak', description: 'Ucz się przez 30 dni z rzędu', icon: '💎' },
  { id: 'topic_master', name: 'Mistrz tematu', description: '100% fiszek z tematu opanowanych', icon: '🏆' },
  { id: 'debugger', name: 'Debugger', description: '10 ćwiczeń kodowania rozwiązanych', icon: '🐛' },
  { id: 'professor', name: 'Profesor', description: '50 wyjaśnień napisanych', icon: '🎓' },
  { id: 'polyglot', name: 'Poliglota', description: 'Wszystkie tematy rozpoczęte', icon: '🌍' },
  { id: 'quiz_ace', name: 'As quizu', description: '10 quizów z wynikiem 100%', icon: '⭐' },
  { id: 'century', name: 'Setka', description: '100 fiszek powtórzonych', icon: '💯' },
  { id: 'coder', name: 'Koder', description: '5 ćwiczeń kodowania rozwiązanych', icon: '💻' },
];

export function getLevelColor(level: Level): string {
  switch (level) {
    case 'Junior': return '#94a3b8';
    case 'Regular': return '#3b82f6';
    case 'Senior': return '#8b5cf6';
    case 'Lead': return '#f59e0b';
    case 'Architect': return '#ef4444';
  }
}
