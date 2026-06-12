import type { Level } from '@/types/progress';

// XP rewards — "earned, not given": XP only for real, first-time-today progress.
// Anti-farming enforcement lives in xpService.awardXP (unique per day per item).
export const XP = {
  FLASHCARD_PASS: 5, // first correct recall of a card today (Dobrze/Łatwe)
  FLASHCARD_HARD: 3, // correct but difficult (Trudne)
  QUIZ_CORRECT: 10, // first correct answer to a question today
  CODING_PASS: 15, // first 100% test pass of an exercise today
  PUZZLE_PASS: 5, // first correct Parsons arrangement today
  LESSON_COMPLETE: 20, // closing a path node (once per lesson, lifetime)
  DAILY_GOAL: 6, // hitting the daily goal (once per day)
  EXPLANATION_BASE: 15,
} as const;

/** Additive combo bonus: +1 XP from a streak of 3, up to +5. Replaces the old multiplier. */
export function getComboBonus(combo: number): number {
  if (combo < 3) return 0;
  return Math.min(5, combo - 2);
}

// Level thresholds — career ladder toward MLOps
const LEVEL_THRESHOLDS: { level: Level; minXP: number }[] = [
  { level: 'Skrypciarz', minXP: 0 },
  { level: 'Pythonista', minXP: 500 },
  { level: 'Automatyk', minXP: 2000 },
  { level: 'ML Engineer', minXP: 5000 },
  { level: 'MLOps Architect', minXP: 10000 },
];

export function getLevel(totalXP: number): Level {
  let current: Level = 'Skrypciarz';
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
  { id: 'sprinter', name: 'Sprinter', description: '50 poprawnych odpowiedzi w sprintach', icon: '⏱️' },
  { id: 'puzzle_master', name: 'Mistrz puzzli', description: '10 puzzli z kodu ułożonych', icon: '🧩' },
];

export function getLevelColor(level: Level): string {
  switch (level) {
    case 'Skrypciarz': return '#94a3b8';
    case 'Pythonista': return '#6366f1';
    case 'Automatyk': return '#8b5cf6';
    case 'ML Engineer': return '#f59e0b';
    case 'MLOps Architect': return '#f43f5e';
  }
}
