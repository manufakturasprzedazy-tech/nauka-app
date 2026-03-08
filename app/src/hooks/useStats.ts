import { useState, useEffect, useCallback } from 'react';
import { db } from '@/db/database';
import { useContentStore } from '@/stores/contentStore';

interface HeatmapDay {
  date: string;
  level: number; // 0-4
  xp: number;
}

interface MaterialProgress {
  materialId: number;
  title: string;
  flashcardsDone: number;
  flashcardsTotal: number;
  quizzesDone: number;
  quizzesTotal: number;
  codingDone: number;
  codingTotal: number;
  explanationsDone: number;
  explanationsTotal: number;
  percentage: number;
}

interface WeeklyXP {
  week: string;
  xp: number;
}

interface TopicAccuracy {
  topic: string;
  materialTitle: string;
  correct: number;
  total: number;
  accuracy: number;
}

export function useStats() {
  const [totalXP, setTotalXP] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [avgXPPerDay, setAvgXPPerDay] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [quizAccuracy, setQuizAccuracy] = useState(0);
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [weakTopics, setWeakTopics] = useState<TopicAccuracy[]>([]);
  const [materialProgress, setMaterialProgress] = useState<MaterialProgress[]>([]);
  const [xpTrend, setXpTrend] = useState<WeeklyXP[]>([]);
  const [loading, setLoading] = useState(true);
  const store = useContentStore();

  const load = useCallback(async () => {
    setLoading(true);

    // Daily activity data
    const activities = await db.dailyActivity.toArray();
    const total = activities.reduce((sum, a) => sum + a.xpEarned, 0);
    setTotalXP(total);
    setTotalDays(activities.length);
    setAvgXPPerDay(activities.length > 0 ? Math.round(total / activities.length) : 0);

    // Longest streak
    const dates = activities
      .map(a => a.date)
      .sort();
    let maxStreak = 0;
    let currentStreak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    maxStreak = Math.max(maxStreak, currentStreak);
    if (dates.length === 0) maxStreak = 0;
    setLongestStreak(maxStreak);

    // Heatmap (last 90 days)
    const today = new Date();
    const heatmapData: HeatmapDay[] = [];
    const activityMap = new Map(activities.map(a => [a.date, a]));
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const activity = activityMap.get(dateStr);
      const xp = activity?.xpEarned ?? 0;
      let level = 0;
      if (xp > 0) level = 1;
      if (xp >= 30) level = 2;
      if (xp >= 75) level = 3;
      if (xp >= 150) level = 4;
      heatmapData.push({ date: dateStr, level, xp });
    }
    setHeatmap(heatmapData);

    // Quiz accuracy
    const quizAttempts = await db.quizAttempts.toArray();
    const correctCount = quizAttempts.filter(a => a.isCorrect).length;
    setQuizAccuracy(quizAttempts.length > 0 ? Math.round(correctCount / quizAttempts.length * 100) : 0);

    // Topic accuracy (weak topics)
    const topicStats = new Map<string, { correct: number; total: number; materialId: number }>();
    for (const attempt of quizAttempts) {
      const question = store.quizzes.find(q => q.id === attempt.questionId);
      if (!question) continue;
      const key = `${question.materialId}:${question.topic}`;
      const existing = topicStats.get(key) || { correct: 0, total: 0, materialId: question.materialId };
      existing.total++;
      if (attempt.isCorrect) existing.correct++;
      topicStats.set(key, existing);
    }

    const topicAccuracies: TopicAccuracy[] = [];
    for (const [key, stats] of topicStats) {
      if (stats.total < 2) continue;
      const topic = key.split(':')[1];
      const mat = store.materials.find(m => m.id === stats.materialId);
      topicAccuracies.push({
        topic,
        materialTitle: mat?.title ?? '',
        correct: stats.correct,
        total: stats.total,
        accuracy: Math.round(stats.correct / stats.total * 100),
      });
    }
    topicAccuracies.sort((a, b) => a.accuracy - b.accuracy);
    setWeakTopics(topicAccuracies.slice(0, 8));

    // Material progress
    const flashcardReviews = await db.flashcardReviews.toArray();
    const reviewedFlashcardIds = new Set(flashcardReviews.map(r => r.flashcardId));
    const answeredQuestionIds = new Set(quizAttempts.map(a => a.questionId));
    const codingAttempts = await db.codingAttempts.toArray();
    const completedExerciseIds = new Set(codingAttempts.filter(a => a.completed).map(a => a.exerciseId));
    const explanationAttempts = await db.explanationAttempts.toArray();
    const writtenExplanationIds = new Set(explanationAttempts.map(a => a.explanationId));

    const progresses: MaterialProgress[] = store.materials.map(mat => {
      const flashcardsTotal = store.flashcards.filter(f => f.materialId === mat.id).length;
      const flashcardsDone = store.flashcards.filter(f => f.materialId === mat.id && reviewedFlashcardIds.has(f.id)).length;
      const quizzesTotal = store.quizzes.filter(q => q.materialId === mat.id).length;
      const quizzesDone = store.quizzes.filter(q => q.materialId === mat.id && answeredQuestionIds.has(q.id)).length;
      const codingTotal = store.exercises.filter(e => e.materialId === mat.id).length;
      const codingDone = store.exercises.filter(e => e.materialId === mat.id && completedExerciseIds.has(e.id)).length;
      const explanationsTotal = store.explanations.filter(e => e.materialId === mat.id).length;
      const explanationsDone = store.explanations.filter(e => e.materialId === mat.id && writtenExplanationIds.has(e.id)).length;

      const totalItems = flashcardsTotal + quizzesTotal + codingTotal + explanationsTotal;
      const doneItems = flashcardsDone + quizzesDone + codingDone + explanationsDone;
      const percentage = totalItems > 0 ? Math.round(doneItems / totalItems * 100) : 0;

      return {
        materialId: mat.id,
        title: mat.title,
        flashcardsDone, flashcardsTotal,
        quizzesDone, quizzesTotal,
        codingDone, codingTotal,
        explanationsDone, explanationsTotal,
        percentage,
      };
    });
    setMaterialProgress(progresses);

    // XP Trend (weekly)
    const weeklyMap = new Map<string, number>();
    for (const activity of activities) {
      const d = new Date(activity.date);
      // Week start (Monday)
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(d);
      weekStart.setDate(diff);
      const weekKey = weekStart.toISOString().split('T')[0];
      weeklyMap.set(weekKey, (weeklyMap.get(weekKey) ?? 0) + activity.xpEarned);
    }
    const trend: WeeklyXP[] = [...weeklyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([week, xp]) => ({ week, xp }));
    setXpTrend(trend);

    setLoading(false);
  }, [store]);

  useEffect(() => { load(); }, [load]);

  return {
    totalXP, totalDays, avgXPPerDay, longestStreak,
    quizAccuracy, heatmap, weakTopics, materialProgress, xpTrend,
    loading,
  };
}
