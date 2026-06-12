import { create } from 'zustand';
import { getSetting, setSetting } from '@/db/database';

interface DailyGoal { flashcards: number; quizzes: number; coding: number }

interface AppState {
  isDark: boolean;
  toggleTheme: () => void;
  dailyGoal: DailyGoal;
  setDailyGoal: (goal: Partial<DailyGoal>) => void;
  loadPersisted: () => Promise<void>;
}

// Single source of truth — achievementService uses it for the daily-goal bonus too
export const DEFAULT_GOAL: DailyGoal = { flashcards: 15, quizzes: 5, coding: 2 };

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
