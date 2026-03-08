import { useState, useEffect, useCallback } from 'react';
import { db, getOrCreateTodayActivity } from '@/db/database';
import type { DailyActivity } from '@/types/progress';

export function useProgress() {
  const [todayActivity, setTodayActivity] = useState<DailyActivity | null>(null);
  const [totalXP, setTotalXP] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const activity = await getOrCreateTodayActivity();
    setTodayActivity(activity);

    const all = await db.dailyActivity.toArray();
    const total = all.reduce((sum, a) => sum + a.xpEarned, 0);
    setTotalXP(total);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { todayActivity, totalXP, loading, refresh: load };
}

export function useAchievements() {
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());

  useEffect(() => {
    db.achievements.toArray().then(list => {
      setUnlocked(new Set(list.map(a => a.id)));
    });
  }, []);

  return { unlocked, isUnlocked: (id: string) => unlocked.has(id) };
}
