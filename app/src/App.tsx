import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ToastProvider } from '@/components/ui/Toast';
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

export default function App() {
  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
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
