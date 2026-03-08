import { useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ExplanationExercise } from '@/components/explanation/ExplanationExercise';
import { useContentStore } from '@/stores/contentStore';
import { shuffleArray } from '@/utils/formatters';
import type { Explanation } from '@/types/content';

export function ExplanationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const materialId = searchParams.get('material') ? Number(searchParams.get('material')) : undefined;

  const store = useContentStore();
  const [started, setStarted] = useState(false);
  const [sessionCards, setSessionCards] = useState<Explanation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  let available: Explanation[];
  if (materialId) {
    available = store.getExplanationsByMaterial(materialId);
  } else {
    available = store.explanations;
  }

  const handleStart = useCallback(() => {
    const shuffled = shuffleArray(available).slice(0, 10);
    setSessionCards(shuffled);
    setCurrentIndex(0);
    setStarted(true);
  }, [available]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => prev + 1);
  }, []);

  // Launcher
  if (!started) {
    return (
      <div>
        <Header title="Wyjaśnianie" showBack />
        <div className="px-4 py-8 space-y-6 text-center">
          <div className="text-5xl mb-4">📝</div>
          <h2 className="text-xl font-bold text-white mb-2">Ćwiczenie wyjaśniania</h2>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            Przeczytaj koncept, napisz własne wyjaśnienie, a potem porównaj z wzorcową odpowiedzią.
          </p>
          <p className="text-slate-500 text-xs">{available.length} ćwiczeń dostępnych</p>
          <Button onClick={handleStart} disabled={available.length === 0} fullWidth size="lg">
            Rozpocznij sesję
          </Button>
        </div>
      </div>
    );
  }

  // Complete
  if (currentIndex >= sessionCards.length) {
    return (
      <div>
        <Header title="Wyjaśnianie" showBack />
        <motion.div
          className="px-4 py-12 text-center space-y-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-5xl mb-2">🎉</div>
          <h2 className="text-xl font-bold text-white">Sesja ukończona!</h2>
          <Card variant="elevated" padding="lg" className="max-w-xs mx-auto">
            <div className="text-3xl font-bold text-white">{sessionCards.length}</div>
            <div className="text-sm text-slate-400">Wyjaśnień napisanych</div>
          </Card>
          <Button onClick={() => navigate('/')} fullWidth>Wróć na stronę główną</Button>
        </motion.div>
      </div>
    );
  }

  const current = sessionCards[currentIndex];

  return (
    <div>
      <Header title={`Wyjaśnianie (${currentIndex + 1}/${sessionCards.length})`} showBack />
      <div className="px-4 py-2">
        <ProgressBar value={(currentIndex + 1) / sessionCards.length} size="sm" />
      </div>
      <ExplanationExercise
        key={current.id}
        explanation={current}
        onNext={handleNext}
      />
    </div>
  );
}
