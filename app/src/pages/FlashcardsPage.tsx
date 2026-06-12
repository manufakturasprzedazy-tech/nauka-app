import { useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { FlashcardItem } from '@/components/flashcard/FlashcardItem';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Card } from '@/components/ui/Card';
import { Confetti } from '@/components/ui/Confetti';
import { EmptyState } from '@/components/ui/EmptyState';
import { XPFloat, useXPFloat } from '@/components/feedback/XPFloat';
import { PySnake } from '@/components/mascot/PySnake';
import { useFlashcards } from '@/hooks/useFlashcards';

export function FlashcardsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const materialId = searchParams.get('material') ? Number(searchParams.get('material')) : undefined;
  const courseId = searchParams.get('course') ?? undefined;

  const { dueCards, newCards, dailyLimitReached, loading, reviewCard, reviewCount } = useFlashcards(courseId, materialId);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [queue, setQueue] = useState<typeof dueCards>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [xpGained, setXpGained] = useState(0);
  const { items, spawn } = useXPFloat();

  const allCards = [...dueCards, ...newCards];

  const startSession = () => {
    setQueue(allCards);
    setCurrentIndex(0);
    setXpGained(0);
    setSessionStarted(true);
  };

  const handleRate = useCallback(async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (currentIndex >= queue.length) return;
    const card = queue[currentIndex];
    const xp = await reviewCard(card.id, rating);
    if (xp > 0) {
      spawn(xp);
      setXpGained(prev => prev + xp);
    }
    if (rating === 'again') {
      // Forgotten card re-enters the session queue until passed (learning step)
      setQueue(prev => [...prev, card]);
    }
    setCurrentIndex(prev => prev + 1);
  }, [currentIndex, queue, reviewCard, spawn]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Ładowanie...</div>;
  }

  // Session launcher
  if (!sessionStarted) {
    return (
      <div>
        <Header title="Fiszki" showBack />
        <div className="px-4 py-8 space-y-6">
          {allCards.length > 0 ? (
            <>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-500/10 border border-indigo-500/25 text-4xl shadow-[0_0_24px_rgba(99,102,241,0.2)]">
                  🎴
                </div>
                <h2 className="text-xl font-extrabold text-white mb-2">Sesja fiszek</h2>
                <p className="text-slate-400 text-sm">
                  {dueCards.length > 0
                    ? `${dueCards.length} fiszek do powtórki + ${newCards.length} nowych`
                    : `${newCards.length} nowych fiszek`}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Nowe karty: max 10 dziennie — tak uczy się skutecznie, nie hurtowo.
                </p>
              </div>
              <Button onClick={startSession} fullWidth size="lg">
                Rozpocznij sesję ({allCards.length})
              </Button>
            </>
          ) : dailyLimitReached ? (
            <EmptyState
              icon={<PySnake mood="happy" size={64} />}
              title="Limit nowych kart na dziś osiągnięty!"
              description="10 nowych fiszek dziennie to optimum dla pamięci — jutro dostaniesz kolejne. Dziś poćwicz quiz albo kod."
              action={<Button onClick={() => navigate('/quiz')}>Zrób quiz</Button>}
            />
          ) : (
            <EmptyState
              icon={<PySnake mood="sleepy" size={64} />}
              title="Wszystko powtórzone!"
              description="Algorytm SM-2 zaplanował następne powtórki. Wróć jutro albo sprawdź się w quizie."
              action={<Button onClick={() => navigate('/quiz')}>Zrób quiz</Button>}
            />
          )}
        </div>
      </div>
    );
  }

  // Session complete
  if (currentIndex >= queue.length) {
    return (
      <div>
        <Header title="Fiszki" showBack />
        <Confetti active />
        <motion.div
          className="px-4 py-12 text-center space-y-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-5xl mb-2">🎉</div>
          <h2 className="text-xl font-extrabold text-white">Sesja ukończona!</h2>
          <Card variant="glow" padding="lg" className="max-w-xs mx-auto">
            <div className="text-3xl font-extrabold text-white tnum">{reviewCount}</div>
            <div className="text-sm text-slate-400">fiszek powtórzonych</div>
            <div className="font-mono text-gradient text-base font-bold mt-2 tnum">+{xpGained} XP</div>
          </Card>
          <Button onClick={() => navigate('/')} fullWidth>Wróć na stronę główną</Button>
        </motion.div>
      </div>
    );
  }

  // Active session
  const card = queue[currentIndex];

  return (
    <div>
      <Header title={`Fiszki (${currentIndex + 1}/${queue.length})`} showBack />
      <XPFloat items={items} />
      <div className="px-4 py-2">
        <ProgressBar value={(currentIndex + 1) / queue.length} size="sm" />
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
