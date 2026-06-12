import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PySnake } from '@/components/mascot/PySnake';
import { useAppStore } from '@/stores/appStore';
import { setSetting } from '@/db/database';
import { cn } from '@/utils/cn';

// Flashcard goals respect the 10-new-cards/day cap (reviews of forgotten cards count too)
const GOALS = [
  { id: 'chill', name: 'Spokojnie', desc: '~5 min dziennie', icon: '🌱', goal: { flashcards: 10, quizzes: 3, coding: 1 } },
  { id: 'solid', name: 'Solidnie', desc: '~15 min dziennie', icon: '🚀', goal: { flashcards: 15, quizzes: 5, coding: 2 } },
  { id: 'intense', name: 'Intensywnie', desc: '~30 min dziennie', icon: '🔥', goal: { flashcards: 25, quizzes: 8, coding: 3 } },
];

const TOUR = [
  { icon: '🎴', title: 'Fiszki z algorytmem SM-2', desc: 'Powtarzasz dokładnie wtedy, gdy mózg zaczyna zapominać. Mniej powtórek, lepsze efekty.' },
  { icon: '⚡', title: 'Quizy z combo', desc: 'Seria poprawnych odpowiedzi daje bonus — do +5 XP za odpowiedź. Błąd zeruje serię.' },
  { icon: '💻', title: 'Prawdziwy kod', desc: 'Piszesz Pythona w edytorze, a testy sprawdzają Twój kod od razu na telefonie.' },
  { icon: '🏆', title: 'Questy i osiągnięcia', desc: 'Codziennie 3 nowe misje, seria dni nauki i poziomy od Skrypciarza do MLOps Architecta.' },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { setDailyGoal } = useAppStore();
  const [step, setStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState('solid');

  const finish = async (target: string) => {
    const preset = GOALS.find(g => g.id === selectedGoal) ?? GOALS[1];
    setDailyGoal(preset.goal);
    await setSetting('onboarding_done', '1');
    navigate(target, { replace: true });
  };

  return (
    <div className="flex min-h-screen max-w-lg mx-auto flex-col bg-[#09090f] text-white ambient-glow">
      <div className="relative z-10 flex flex-1 flex-col px-6 py-10">
        {/* Progress dots */}
        <div className="mb-8 flex justify-center gap-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === step ? 'w-8 bg-gradient-to-r from-indigo-500 to-violet-500' : 'w-1.5 bg-white/15',
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="flex flex-1 flex-col items-center justify-center text-center"
            >
              <PySnake mood="celebrate" size={160} />
              <h1 className="mt-6 text-3xl font-extrabold">
                Cześć! Jestem <span className="text-gradient">Py</span> 🐍
              </h1>
              <p className="mt-3 max-w-xs text-slate-400 leading-relaxed">
                Pomogę Ci przejść drogę od podstaw Pythona do <b className="text-slate-200">MLOps i automatyzacji AI</b> —
                fiszkami, quizami i prawdziwym kodem. Krok po kroku, bez domyślania się.
              </p>
              <Button size="lg" fullWidth className="mt-10 max-w-xs" onClick={() => setStep(1)}>
                Zaczynajmy!
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="goal"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="flex flex-1 flex-col"
            >
              <h2 className="text-2xl font-extrabold">Ile czasu dziennie?</h2>
              <p className="mt-1.5 text-sm text-slate-400">Dopasuję cel dzienny. Zawsze możesz to zmienić w profilu.</p>
              <div className="mt-6 space-y-3">
                {GOALS.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGoal(g.id)}
                    className={cn(
                      'w-full rounded-2xl border p-4 text-left transition-all active:scale-[0.98]',
                      selectedGoal === g.id
                        ? 'border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.25)]'
                        : 'border-slate-400/15 bg-[#10101a]',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{g.icon}</span>
                      <div className="flex-1">
                        <p className="font-bold text-white">{g.name}</p>
                        <p className="text-xs text-slate-400">{g.desc}</p>
                      </div>
                      <p className="text-xs text-slate-500 tnum">
                        {g.goal.flashcards} fiszek · {g.goal.quizzes} quiz · {g.goal.coding} kod
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex-1" />
              <Button size="lg" fullWidth onClick={() => setStep(2)}>
                Dalej
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="tour"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="flex flex-1 flex-col"
            >
              <h2 className="text-2xl font-extrabold">Jak będziesz się uczyć?</h2>
              <div className="mt-6 space-y-3">
                {TOUR.map((t, i) => (
                  <motion.div
                    key={t.title}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.1 }}
                  >
                    <Card variant="default">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{t.icon}</span>
                        <div>
                          <p className="text-sm font-bold text-white">{t.title}</p>
                          <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">{t.desc}</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
              <div className="flex-1" />
              <div className="space-y-2">
                <Button size="lg" fullWidth onClick={() => finish('/kursy')}>
                  🚀 Zacznij pierwszą lekcję
                </Button>
                <Button variant="ghost" fullWidth onClick={() => finish('/')}>
                  Przejdź do aplikacji
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
