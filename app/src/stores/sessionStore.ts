import { create } from 'zustand';
import { getSetting, setSetting } from '@/db/database';

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
