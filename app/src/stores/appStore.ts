import { create } from 'zustand';
import { getSetting, setSetting } from '@/db/database';

interface DailyGoal { flashcards: number; quizzes: number; coding: number; explanations: number }

interface AppState {
  isDark: boolean;
  toggleTheme: () => void;
  dailyGoal: DailyGoal;
  setDailyGoal: (goal: Partial<DailyGoal>) => void;
  loadPersisted: () => Promise<void>;
}

const DEFAULT_GOAL: DailyGoal = { flashcards: 20, quizzes: 5, coding: 2, explanations: 3 };

export const useAppStore = create<AppState>()((set, get) => ({
  isDark: true,
  toggleTheme: () => set((s) => {
    const next = !s.isDark;
    document.documentElement.classList.toggle('light', !next);
    document.documentElement.classList.toggle('dark', next);
    return { isDark: next };
  }),
  dailyGoal: DEFAULT_GOAL,
  setDailyGoal: (goal) => {
    const merged = { ...get().dailyGoal, ...goal };
    set({ dailyGoal: merged });
    setSetting('daily_goal', JSON.stringify(merged));
  },
  loadPersisted: async () => {
    try {
      const raw = await getSetting('daily_goal', '');
      if (raw) set({ dailyGoal: { ...DEFAULT_GOAL, ...JSON.parse(raw) } });
    } catch {
      // corrupted setting — keep defaults
    }
  },
}));
