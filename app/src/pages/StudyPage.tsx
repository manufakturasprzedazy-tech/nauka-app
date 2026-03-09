import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { useFlashcards } from '@/hooks/useFlashcards';
import { useContentStore } from '@/stores/contentStore';

export function StudyPage() {
  const { dueCards, newCards } = useFlashcards();
  const { quizzes, exercises } = useContentStore();

  const modes = [
    {
      to: '/fiszki',
      icon: '🎴',
      title: 'Fiszki',
      description: 'Spaced repetition — ucz się efektywnie',
      stat: `${dueCards.length + newCards.length} do nauki`,
      gradient: 'from-blue-600/20 to-blue-800/20',
    },
    {
      to: '/quiz',
      icon: '❓',
      title: 'Quiz',
      description: 'Wielokrotny wybór — sprawdź wiedzę',
      stat: `${quizzes.length} pytań`,
      gradient: 'from-emerald-600/20 to-emerald-800/20',
    },
    {
      to: '/kodowanie',
      icon: '💻',
      title: 'Kodowanie',
      description: 'Pisz kod — ćwicz praktycznie',
      stat: `${exercises.length} ćwiczeń`,
      gradient: 'from-amber-600/20 to-amber-800/20',
    },
  ];

  return (
    <div>
      <Header title="Nauka" />
      <div className="px-4 py-4 space-y-3">
        {modes.map(mode => (
          <Link key={mode.to} to={mode.to}>
            <Card variant="default" className={`bg-gradient-to-br ${mode.gradient} active:scale-[0.98] transition-transform mb-3`}>
              <div className="flex items-center gap-4">
                <div className="text-3xl">{mode.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-base">{mode.title}</h3>
                  <p className="text-slate-400 text-sm">{mode.description}</p>
                  <p className="text-xs text-blue-400 mt-1">{mode.stat}</p>
                </div>
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
