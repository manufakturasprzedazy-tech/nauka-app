/**
 * SM-2 Spaced Repetition Algorithm
 * Based on SuperMemo SM-2 by Piotr Wozniak
 *
 * Quality ratings:
 * 0 - "Nie pamiętam" (complete blackout)
 * 1 - (not used in UI)
 * 2 - (not used in UI)
 * 3 - "Trudne" (correct but with difficulty)
 * 4 - "Dobrze" (correct with some hesitation)
 * 5 - "Łatwe" (perfect response)
 */

export interface SM2Result {
  easinessFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReview: string;
}

export function calculateSM2(
  quality: number, // 0-5
  previousEF: number,
  previousInterval: number,
  previousReps: number
): SM2Result {
  // Clamp quality to 0-5
  quality = Math.max(0, Math.min(5, quality));

  let ef = previousEF;
  let interval = previousInterval;
  let reps = previousReps;

  // Update easiness factor
  ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  ef = Math.max(1.3, ef); // Never go below 1.3

  if (quality < 3) {
    // Failed — reset repetitions, start over
    reps = 0;
    interval = 1;
  } else {
    // Successful recall
    reps += 1;
    if (reps === 1) {
      interval = 1;
    } else if (reps === 2) {
      interval = 6;
    } else {
      interval = Math.round(previousInterval * ef);
    }
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    easinessFactor: Math.round(ef * 100) / 100,
    intervalDays: interval,
    repetitions: reps,
    nextReview: nextReview.toISOString().split('T')[0],
  };
}

// Map UI button to SM-2 quality
export function buttonToQuality(button: 'again' | 'hard' | 'good' | 'easy'): number {
  switch (button) {
    case 'again': return 0;
    case 'hard': return 3;
    case 'good': return 4;
    case 'easy': return 5;
  }
}

// Default values for new flashcards
export const SM2_DEFAULTS = {
  easinessFactor: 2.5,
  intervalDays: 0,
  repetitions: 0,
  nextReview: new Date().toISOString().split('T')[0],
};
