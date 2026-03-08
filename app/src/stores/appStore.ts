import { create } from 'zustand';

interface AppState {
  isDark: boolean;
  toggleTheme: () => void;
  dailyGoal: { flashcards: number; quizzes: number; coding: number; explanations: number };
  setDailyGoal: (goal: Partial<AppState['dailyGoal']>) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  isDark: true,
  toggleTheme: () => set((s) => {
    const next = !s.isDark;
    document.documentElement.classList.toggle('light', !next);
    document.documentElement.classList.toggle('dark', next);
    return { isDark: next };
  }),
  dailyGoal: { flashcards: 20, quizzes: 5, coding: 2, explanations: 3 },
  setDailyGoal: (goal) => set((s) => ({ dailyGoal: { ...s.dailyGoal, ...goal } })),
}));
