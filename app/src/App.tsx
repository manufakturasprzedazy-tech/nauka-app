import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ToastProvider } from '@/components/ui/Toast';
import { CelebrationHost } from '@/components/feedback/CelebrationHost';
import { HomePage } from '@/pages/HomePage';
import { CoursesPage } from '@/pages/CoursesPage';
import { CourseDetailPage } from '@/pages/CourseDetailPage';
import { MaterialDetailPage } from '@/pages/MaterialDetailPage';
import { FlashcardsPage } from '@/pages/FlashcardsPage';
import { QuizPage } from '@/pages/QuizPage';
import { CodingPage } from '@/pages/CodingPage';
import { CodingExercisePage } from '@/pages/CodingExercisePage';
import { StudyPage } from '@/pages/StudyPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { QuizReviewPage } from '@/pages/QuizReviewPage';
import { StatsPage } from '@/pages/StatsPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { getSetting } from '@/db/database';
import { useAppStore } from '@/stores/appStore';

export default function App() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const loadPersisted = useAppStore(s => s.loadPersisted);

  useEffect(() => {
    loadPersisted();
    getSetting('onboarding_done', '0').then(v => setOnboarded(v === '1'));
  }, [loadPersisted]);

  // Wait for the onboarding flag before routing (avoids a flash of the dashboard)
  if (onboarded === null) {
    return <div className="min-h-screen bg-[#09090f]" />;
  }

  return (
    <ToastProvider>
      <CelebrationHost />
      <HashRouter>
        <Routes>
          <Route path="/start" element={<OnboardingPage />} />
          <Route element={<AppShell />}>
            <Route path="/" element={onboarded ? <HomePage /> : <Navigate to="/start" replace />} />
            <Route path="/kursy" element={<CoursesPage />} />
            <Route path="/kursy/:courseId" element={<CourseDetailPage />} />
            <Route path="/kursy/:courseId/:id" element={<MaterialDetailPage />} />
            <Route path="/fiszki" element={<FlashcardsPage />} />
            <Route path="/nauka" element={<StudyPage />} />
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/kodowanie" element={<CodingPage />} />
            <Route path="/kodowanie/:id" element={<CodingExercisePage />} />
            <Route path="/profil" element={<ProfilePage />} />
            <Route path="/powtorka" element={<QuizReviewPage />} />
            <Route path="/statystyki" element={<StatsPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </ToastProvider>
  );
}
