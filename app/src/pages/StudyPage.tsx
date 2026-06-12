import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { useFlashcards } from '@/hooks/useFlashcards';
import { useContentStore } from '@/stores/contentStore';
import { getStartedMaterialIds } from '@/services/progressService';

export function StudyPage() {
  const { dueCards, newCards } = useFlashcards();
  const { quizzes, exercises } = useContentStore();
  const [counts, setCounts] = useState({ quizzes: 0, exercises: 0 });

  // Tile counters must match what the launchers actually offer (started lessons only)
  useEffect(() => {
    getStartedMaterialIds().then(started => {
      setCounts({
        quizzes: quizzes.filter(q => started.has(q.materialId)).length,
        exercises: exercises.filter(e => started.has(e.materialId)).length,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const modes = [
    {
      to: '/fiszki',
      icon: '🎴',
      title: 'Fiszki',
      description: 'Spaced repetition — ucz się efektywnie',
      stat: `${dueCards.length + newCards.length} do nauki`,
      box: 'bg-indigo-500/15 border-indigo-500/25',
      statColor: 'text-indigo-300',
    },
    {
      to: '/quiz',
      icon: '❓',
      title: 'Quiz',
      description: 'Wielokrotny wybór — sprawdź wiedzę',
      stat: `${counts.quizzes} pytań w Twojej puli`,
      box: 'bg-emerald-500/15 border-emerald-500/25',
      statColor: 'text-emerald-300',
    },
    {
      to: '/sprint',
      icon: '⏱️',
      title: 'Sprint 60s',
      description: 'Blitz na czas — nabijaj combo i XP',
      stat: 'Pobij swój rekord',
      box: 'bg-orange-500/15 border-orange-500/25',
      statColor: 'text-orange-300',
    },
    {
      to: '/kodowanie',
      icon: '💻',
      title: 'Kodowanie',
      description: 'Pisz kod — ćwicz praktycznie',
      stat: `${counts.exercises} ćwiczeń w Twojej puli`,
      box: 'bg-amber-500/15 border-amber-500/25',
      statColor: 'text-amber-300',
    },
    {
      to: '/puzzle',
      icon: '🧩',
      title: 'Puzzle z kodu',
      description: 'Ułóż linie programu w dobrej kolejności',
      stat: 'Struktura bez frustracji',
      box: 'bg-violet-500/15 border-violet-500/25',
      statColor: 'text-violet-300',
    },
    {
      to: '/powtorka',
      icon: '🔄',
      title: 'Powtórka błędów',
      description: 'Wróć do pytań, które poszły źle',
      stat: 'Utrwal słabe punkty',
      box: 'bg-rose-500/15 border-rose-500/25',
      statColor: 'text-rose-300',
    },
  ];

  return (
    <div>
      <Header title="Nauka" />
      <div className="px-4 py-4 space-y-3">
        {modes.map((mode, i) => (
          <motion.div
            key={mode.to}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link to={mode.to}>
              <Card variant="elevated" className="active:scale-[0.98] transition-transform">
                <div className="flex items-center gap-4">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-2xl ${mode.box}`}>
                    {mode.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-base">{mode.title}</h3>
                    <p className="text-slate-400 text-sm">{mode.description}</p>
                    <p className={`text-xs mt-1 font-medium ${mode.statColor}`}>{mode.stat}</p>
                  </div>
                  <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
