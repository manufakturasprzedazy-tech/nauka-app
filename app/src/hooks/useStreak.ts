import { useState, useEffect, useCallback } from 'react';
import { db } from '@/db/database';
import { todayString } from '@/utils/formatters';

export function useStreak() {
  const [streak, setStreak] = useState(0);
  const [todayActive, setTodayActive] = useState(false);

  const calculateStreak = useCallback(async () => {
    const activities = await db.dailyActivity.orderBy('date').reverse().toArray();
    if (activities.length === 0) {
      setStreak(0);
      setTodayActive(false);
      return;
    }

    const today = todayString();
    let count = 0;
    const dateSet = new Set(activities.filter(a =>
      a.flashcardsReviewed > 0 || a.quizAnswered > 0 || a.codingCompleted > 0 || a.explanationsWritten > 0
    ).map(a => a.date));

    setTodayActive(dateSet.has(today));

    // Count consecutive days ending today or yesterday
    let checkDate = new Date();
    if (!dateSet.has(today)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (dateSet.has(dateStr)) {
        count++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    setStreak(count);
  }, []);

  useEffect(() => { calculateStreak(); }, [calculateStreak]);

  return { streak, todayActive, refresh: calculateStreak };
}
