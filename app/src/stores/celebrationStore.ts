import { create } from 'zustand';
import type { Level } from '@/types/progress';

export type Celebration =
  | { type: 'levelup'; level: Level }
  | { type: 'achievement'; id: string }
  | { type: 'streak'; days: number }
  | { type: 'quest'; name: string; xp: number };

interface CelebrationState {
  queue: Celebration[];
  push: (c: Celebration) => void;
  dismiss: () => void;
}

// FIFO queue so celebration modals never stack on top of each other
export const useCelebrationStore = create<CelebrationState>()((set) => ({
  queue: [],
  push: (c) => set(s => ({ queue: [...s.queue, c] })),
  dismiss: () => set(s => ({ queue: s.queue.slice(1) })),
}));
