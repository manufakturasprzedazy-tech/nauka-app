// Parsons problems — code-ordering puzzles generated from exercise solutions.
// Research-backed for beginners: teaches program structure without syntax frustration.

import type { CodingExercise } from '@/types/content';

export interface PuzzleLine {
  id: number;
  text: string; // trimmed code
  indent: number; // indentation level (multiples of 4 spaces normalized)
}

export interface ParsonsPuzzle {
  exercise: CodingExercise;
  correct: PuzzleLine[]; // lines in solution order
  shuffled: PuzzleLine[];
}

const MIN_LINES = 3;
const MAX_LINES = 10;

function solutionLines(solution: string): { text: string; indent: number }[] {
  return solution
    .replace(/\r/g, '')
    .split('\n')
    .filter(l => l.trim().length > 0 && !l.trim().startsWith('#'))
    .map(l => {
      const leading = l.match(/^\s*/)?.[0].length ?? 0;
      return { text: l.trim(), indent: Math.round(leading / 4) };
    });
}

/** Can this exercise be turned into a sensible puzzle? */
export function isPuzzleable(exercise: CodingExercise): boolean {
  const lines = solutionLines(exercise.solution);
  if (lines.length < MIN_LINES || lines.length > MAX_LINES) return false;
  // A puzzle with all-identical lines is pointless
  return new Set(lines.map(l => l.text)).size >= MIN_LINES;
}

export function buildPuzzle(exercise: CodingExercise): ParsonsPuzzle {
  const correct = solutionLines(exercise.solution).map((l, i) => ({ id: i, ...l }));

  // Shuffle until the order differs from the solution (guard for tiny puzzles)
  let shuffled = [...correct];
  for (let attempt = 0; attempt < 10; attempt++) {
    shuffled = [...correct];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    if (shuffled.some((l, i) => l.text !== correct[i].text)) break;
  }

  return { exercise, correct, shuffled };
}

/** Compare by text per position (handles duplicate lines fairly). */
export function checkOrder(answer: PuzzleLine[], correct: PuzzleLine[]): boolean[] {
  return correct.map((line, i) => answer[i]?.text === line.text);
}
