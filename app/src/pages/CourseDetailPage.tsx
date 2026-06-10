import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { LearningPath } from '@/components/courses/LearningPath';
import { MaterialCard } from '@/components/courses/MaterialCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useContentStore } from '@/stores/contentStore';
import { useMaterialProgress } from '@/hooks/useMaterialProgress';
import { getSetting, setSetting } from '@/db/database';
import { cn } from '@/utils/cn';

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { getCourse } = useContentStore();
  const { progressList, loading } = useMaterialProgress(courseId);
  const [view, setView] = useState<'path' | 'list'>('path');
  const [freeMode, setFreeMode] = useState(false);

  useEffect(() => {
    getSetting('course_view', 'path').then(v => setView(v === 'list' ? 'list' : 'path'));
    getSetting('path_free_mode', '0').then(v => setFreeMode(v === '1'));
  }, []);

  const course = getCourse(courseId!);
  if (!course) {
    return <div className="p-4 text-slate-400">Kurs nie znaleziony</div>;
  }

  const completedCount = progressList.filter(p => p.percent >= 0.999).length;
  const overall = progressList.length > 0
    ? progressList.reduce((s, p) => s + p.percent, 0) / progressList.length
    : 0;

  const toggleView = () => {
    const next = view === 'path' ? 'list' : 'path';
    setView(next);
    setSetting('course_view', next);
  };

  const toggleFreeMode = () => {
    const next = !freeMode;
    setFreeMode(next);
    setSetting('path_free_mode', next ? '1' : '0');
  };

  return (
    <div>
      <Header
        title={course.name}
        showBack
        right={
          <div className="flex items-center gap-1">
            <button
              onClick={toggleFreeMode}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl text-base transition-colors',
                freeMode ? 'text-amber-400' : 'text-slate-500',
              )}
              title={freeMode ? 'Kolejność dowolna — kliknij, by włączyć blokowanie' : 'Lekcje po kolei — kliknij, by odblokować wszystkie'}
            >
              {freeMode ? '🔓' : '🔒'}
            </button>
            <button
              onClick={toggleView}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:text-white"
              title={view === 'path' ? 'Widok listy' : 'Widok ścieżki'}
            >
              {view === 'path' ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M12 3v6 M12 15v6" />
                </svg>
              )}
            </button>
          </div>
        }
      />

      <div className="px-4 py-4">
        {/* Course hero */}
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/25 bg-indigo-500/10 text-2xl">
            {course.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold text-white">{course.name}</h2>
            <p className="text-xs text-slate-400 tnum">
              {completedCount}/{progressList.length} lekcji ukończonych
            </p>
          </div>
        </div>
        <ProgressBar value={overall} size="sm" className="mb-2" />

        {loading ? (
          <div className="space-y-3 pt-4">
            <Skeleton className="mx-auto h-20 w-20 rounded-full" />
            <Skeleton className="mx-auto h-20 w-20 rounded-full translate-x-16" />
            <Skeleton className="mx-auto h-20 w-20 rounded-full" />
          </div>
        ) : view === 'path' ? (
          <LearningPath courseId={courseId!} items={progressList} freeMode={freeMode} />
        ) : (
          <div className="space-y-3 pt-2">
            {progressList.map(p => (
              <MaterialCard key={p.material.id} material={p.material} courseId={courseId!} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
