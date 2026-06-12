import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { FormattedText } from '@/components/ui/FormattedText';
import { cn } from '@/utils/cn';
import { useContentStore } from '@/stores/contentStore';
import { db, getSetting, setSetting } from '@/db/database';
import { XP } from '@/services/gamification';
import { awardXP } from '@/services/xpService';
import { useCelebrationStore } from '@/stores/celebrationStore';

type Tab = 'lesson' | 'flashcards' | 'quiz' | 'coding';

interface StepProgress {
  lessonRead: boolean;
  flashcardsDone: number;
  quizDone: number;
  codingDone: number;
}

export function MaterialDetailPage() {
  const { id } = useParams<{ courseId: string; id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('lesson');
  const [steps, setSteps] = useState<StepProgress>({ lessonRead: false, flashcardsDone: 0, quizDone: 0, codingDone: 0 });
  const { getMaterial, getFlashcardsByMaterial, getQuizzesByMaterial, getExercisesByMaterial } = useContentStore();

  const material = getMaterial(Number(id));
  const flashcards = material ? getFlashcardsByMaterial(material.id) : [];
  const quizzes = material ? getQuizzesByMaterial(material.id) : [];
  const exercises = material ? getExercisesByMaterial(material.id) : [];

  useEffect(() => {
    if (!material) return;
    Promise.all([
      db.flashcardReviews.toArray(),
      db.quizAttempts.toArray(),
      db.codingAttempts.toArray(),
      getSetting(`lesson_read_${material.id}`, '0'),
    ]).then(([reviews, quizAttempts, codingAttempts, readFlag]) => {
      const reviewedIds = new Set(reviews.map(r => r.flashcardId));
      const answeredIds = new Set(quizAttempts.map(a => a.questionId));
      const codedIds = new Set(codingAttempts.filter(a => a.completed).map(a => a.exerciseId));
      setSteps({
        lessonRead: readFlag === '1',
        flashcardsDone: flashcards.filter(f => reviewedIds.has(f.id)).length,
        quizDone: quizzes.filter(q => answeredIds.has(q.id)).length,
        codingDone: exercises.filter(e => codedIds.has(e.id)).length,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material?.id]);

  if (!material) return <div className="p-4 text-slate-400">Materiał nie znaleziony</div>;

  const markLessonRead = async () => {
    await setSetting(`lesson_read_${material.id}`, '1');
    setSteps(s => ({ ...s, lessonRead: true }));
  };

  const stepList = [
    {
      key: 'lesson' as const,
      icon: '📖',
      label: 'Lekcja',
      done: steps.lessonRead ? 1 : 0,
      total: 1,
      action: () => setActiveTab('lesson'),
    },
    {
      key: 'flashcards' as const,
      icon: '🎴',
      label: 'Fiszki',
      done: steps.flashcardsDone,
      total: flashcards.length,
      action: () => navigate(`/fiszki?material=${material.id}`),
    },
    {
      key: 'quiz' as const,
      icon: '❓',
      label: 'Quiz',
      done: steps.quizDone,
      total: quizzes.length,
      action: () => navigate(`/quiz?material=${material.id}`),
    },
    {
      key: 'coding' as const,
      icon: '💻',
      label: 'Kod',
      done: steps.codingDone,
      total: exercises.length,
      action: () => setActiveTab('coding'),
    },
  ].filter(s => s.total > 0);

  const totalDone = stepList.reduce((s, x) => s + x.done, 0);
  const totalAll = stepList.reduce((s, x) => s + x.total, 0);
  const progress = totalAll > 0 ? totalDone / totalAll : 0;
  const nextStep = stepList.find(s => s.done < s.total);

  // Closing a path node pays +20 XP, once per lesson (lifetime)
  useEffect(() => {
    if (totalAll > 0 && !nextStep && material) {
      awardXP('lesson', material.id, XP.LESSON_COMPLETE, { oncePerLifetime: true }).then(xp => {
        if (xp > 0) {
          useCelebrationStore.getState().push({ type: 'quest', name: `Lekcja ukończona: ${material.title}`, xp });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAll, nextStep?.key, material?.id]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'lesson', label: '📖 Lekcja', count: 0 },
    { key: 'flashcards', label: 'Fiszki', count: flashcards.length },
    { key: 'quiz', label: 'Quiz', count: quizzes.length },
    { key: 'coding', label: 'Kod', count: exercises.length },
  ];

  return (
    <div>
      <Header title={material.title} showBack />

      {/* Hero: progress + continue CTA */}
      <div className="px-4 pt-4">
        <Card variant="glow" padding="md">
          <div className="flex items-center gap-4">
            <ProgressRing value={progress} size={64} strokeWidth={6}>
              <span className="text-xs font-bold text-white tnum">{Math.round(progress * 100)}%</span>
            </ProgressRing>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1 mb-1.5">
                {material.topics.slice(0, 3).map((t, i) => (
                  <Badge key={i} size="sm" variant="info">{t}</Badge>
                ))}
              </div>
              {nextStep ? (
                <Button size="sm" onClick={nextStep.action}>
                  {progress === 0 ? 'Zacznij' : 'Kontynuuj'}: {nextStep.icon} {nextStep.label}
                </Button>
              ) : (
                <p className="text-sm font-semibold text-emerald-400">✓ Materiał ukończony!</p>
              )}
            </div>
          </div>

          {/* Step checklist */}
          <div className="mt-4 grid grid-cols-4 gap-1.5">
            {stepList.map(step => {
              const stepDone = step.done >= step.total;
              return (
                <button
                  key={step.key}
                  onClick={step.action}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 transition-colors',
                    stepDone
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : 'border-slate-400/10 bg-white/[0.03] active:bg-white/[0.07]',
                  )}
                >
                  <span className="text-base">{stepDone ? '✅' : step.icon}</span>
                  <span className="text-[10px] font-medium text-slate-300">{step.label}</span>
                  <span className={cn('text-[10px] tnum', stepDone ? 'text-emerald-400' : 'text-slate-500')}>
                    {step.done}/{step.total}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto px-4 py-3 gap-1.5 no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border',
              activeTab === tab.key
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_16px_rgba(99,102,241,0.35)]'
                : 'bg-white/[0.03] border-slate-400/10 text-slate-400',
            )}
          >
            {tab.label}{tab.count > 0 ? ` (${tab.count})` : ''}
          </button>
        ))}
      </div>

      <div className="px-4 pb-6">
        {activeTab === 'lesson' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Summary intro */}
            <Card variant="default">
              <p className="text-[15px] text-slate-300 leading-7">{material.summary}</p>
            </Card>

            {/* Lesson notes */}
            {material.notes ? (
              <>
                <FormattedText text={material.notes} className="text-[15px] text-slate-300 leading-7 space-y-3" />
                {!steps.lessonRead ? (
                  <Button onClick={markLessonRead} fullWidth size="lg">
                    ✓ Przeczytane — przejdź dalej
                  </Button>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-2 text-sm text-emerald-400">
                    ✓ Lekcja przeczytana
                  </div>
                )}
                {steps.lessonRead && flashcards.length > 0 && (
                  <Button onClick={() => navigate(`/fiszki?material=${material.id}`)} variant="secondary" fullWidth>
                    🎴 Utrwal fiszkami ({flashcards.length})
                  </Button>
                )}
              </>
            ) : (
              <Card variant="outlined">
                <p className="text-sm text-slate-400 text-center py-4">
                  Notatki dla tej lekcji nie są jeszcze dostępne — zacznij od fiszek!
                </p>
              </Card>
            )}
          </motion.div>
        )}

        {activeTab === 'flashcards' && (
          <div className="space-y-3">
            <Button onClick={() => navigate(`/fiszki?material=${material.id}`)} fullWidth>
              Rozpocznij sesję fiszek
            </Button>
            {flashcards.slice(0, 5).map(fc => (
              <Card key={fc.id} variant="default">
                <FormattedText text={fc.front} className="text-sm text-white font-medium" />
              </Card>
            ))}
            {flashcards.length > 5 && (
              <p className="text-xs text-slate-500 text-center">...i {flashcards.length - 5} więcej</p>
            )}
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="space-y-3">
            <Button onClick={() => navigate(`/quiz?material=${material.id}`)} fullWidth>
              Rozpocznij quiz ({quizzes.length} pytań)
            </Button>
            {quizzes.slice(0, 3).map(q => (
              <Card key={q.id} variant="default">
                <FormattedText text={q.question} className="text-sm text-white" />
                <div className="mt-2">
                  <Badge variant={q.difficulty === 'easy' ? 'success' : q.difficulty === 'medium' ? 'warning' : 'danger'} size="sm">
                    {q.difficulty === 'easy' ? 'łatwe' : q.difficulty === 'medium' ? 'średnie' : 'trudne'}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'coding' && (
          <div className="space-y-3">
            {exercises.map(ex => (
              <Card
                key={ex.id}
                variant="default"
                className="cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => navigate(`/kodowanie/${ex.id}`)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={ex.difficulty === 'easy' ? 'success' : ex.difficulty === 'medium' ? 'warning' : 'danger'} size="sm">
                    {ex.difficulty === 'easy' ? 'łatwe' : ex.difficulty === 'medium' ? 'średnie' : 'trudne'}
                  </Badge>
                </div>
                <p className="text-sm text-white font-medium">{ex.title}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
