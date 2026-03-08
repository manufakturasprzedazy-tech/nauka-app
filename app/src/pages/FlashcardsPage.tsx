import { useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { FlashcardItem } from '@/components/flashcard/FlashcardItem';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Card } from '@/components/ui/Card';
import { useFlashcards } from '@/hooks/useFlashcards';

export function FlashcardsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const materialId = searchParams.get('material') ? Number(searchParams.get('material')) : undefined;
  const courseId = searchParams.get('course') ?? undefined;

  const { dueCards, newCards, loading, reviewCard, reviewCount } = useFlashcards(courseId, materialId);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [xpGained, setXpGained] = useState(0);

  const allCards = [...dueCards, ...newCards];

  const handleRate = useCallback(async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (currentIndex >= allCards.length) return;
    const card = allCards[currentIndex];
    const xp = await reviewCard(card.id, rating);
    setXpGained(prev => prev + xp);
    setCurrentIndex(prev => prev + 1);
  }, [currentIndex, allCards, reviewCard]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Ładowanie...</div>;
  }

  // Session launcher
  if (!sessionStarted) {
    return (
      <div>
        <Header title="Fiszki" showBack />
        <div className="px-4 py-8 space-y-6">
          <div className="text-center">
            <div className="text-5xl mb-4">🎴</div>
            <h2 className="text-xl font-bold text-white mb-2">Sesja fiszek</h2>
            <p className="text-slate-400 text-sm">
              {dueCards.length > 0
                ? `${dueCards.length} fiszek do powtórki + ${newCards.length} nowych`
                : newCards.length > 0
                  ? `${newCards.length} nowych fiszek`
                  : 'Brak fiszek do powtórki — wróć jutro!'
              }
            </p>
          </div>
          {allCards.length > 0 ? (
            <Button onClick={() => setSessionStarted(true)} fullWidth size="lg">
              Rozpocznij sesję ({allCards.length})
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => navigate(-1)} fullWidth>
              Wróć
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Session complete
  if (currentIndex >= allCards.length) {
    return (
      <div>
        <Header title="Fiszki" showBack />
        <motion.div
          className="px-4 py-12 text-center space-y-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-5xl mb-2">🎉</div>
          <h2 className="text-xl font-bold text-white">Sesja ukończona!</h2>
          <Card variant="elevated" padding="lg" className="max-w-xs mx-auto">
            <div className="text-3xl font-bold text-white">{reviewCount}</div>
            <div className="text-sm text-slate-400">Fiszek powtórzonych</div>
            <div className="text-emerald-400 text-sm font-medium mt-2">+{xpGained} XP</div>
          </Card>
          <Button onClick={() => navigate('/')} fullWidth>Wróć na stronę główną</Button>
        </motion.div>
      </div>
    );
  }

  // Active session
  const card = allCards[currentIndex];

  return (
    <div>
      <Header title={`Fiszki (${currentIndex + 1}/${allCards.length})`} showBack />
      <div className="px-4 py-2">
        <ProgressBar value={(currentIndex + 1) / allCards.length} size="sm" />
      </div>
      <div className="py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={card.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.2 }}
          >
            <FlashcardItem card={card} onRate={handleRate} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
