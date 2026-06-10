import { create } from 'zustand';
import { getSetting, setSetting } from '@/db/database';

// Combo multiplier: x1 → x1.5 at combo 5 → x2 at combo 10
export function getComboMultiplier(combo: number): number {
  if (combo >= 10) return 2;
  if (combo >= 5) return 1.5;
  return 1;
}

interface SessionState {
  combo: number;
  bestCombo: number;
  registerAnswer: (correct: boolean) => number; // returns new combo
  resetCombo: () => void;
}

export const useSessionStore = create<SessionState>()((set, get) => ({
  combo: 0,
  bestCombo: 0,
  registerAnswer: (correct) => {
    if (!correct) {
      set({ combo: 0 });
      return 0;
    }
    const combo = get().combo + 1;
    const bestCombo = Math.max(combo, get().bestCombo);
    set({ combo, bestCombo });
    if (combo > 1) {
      getSetting('best_combo', '0').then(v => {
        if (combo > Number(v)) setSetting('best_combo', String(combo));
      });
    }
    return combo;
  },
  resetCombo: () => set({ combo: 0 }),
}));
