import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { FormattedText } from '@/components/ui/FormattedText';
import { cn } from '@/utils/cn';
import { useContentStore } from '@/stores/contentStore';
import { db } from '@/db/database';

type Tab = 'info' | 'notes' | 'flashcards' | 'quiz' | 'coding';

export function MaterialDetailPage() {
  const { courseId, id } = useParams<{ courseId: string; id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [progress, setProgress] = useState(0);
  const { getMaterial, getFlashcardsByMaterial, getQuizzesByMaterial, getExercisesByMaterial } = useContentStore();

  const material = getMaterial(Number(id));

  const flashcards = material ? getFlashcardsByMaterial(material.id) : [];
  const quizzes = material ? getQuizzesByMaterial(material.id) : [];
  const exercises = material ? getExercisesByMaterial(material.id) : [];

  useEffect(() => {
    if (!material) return;
    const total = flashcards.length + quizzes.length + exercises.length;
    if (total === 0) return;

    Promise.all([
      db.flashcardReviews.toArray(),
      db.quizAttempts.toArray(),
      db.codingAttempts.toArray(),
    ]).then(([reviews, quizAttempts, codingAttempts]) => {
      const reviewedIds = new Set(reviews.map(r => r.flashcardId));
      const answeredIds = new Set(quizAttempts.map(a => a.questionId));
      const codedIds = new Set(codingAttempts.filter(a => a.completed).map(a => a.exerciseId));

      let done = 0;
      done += flashcards.filter(f => reviewedIds.has(f.id)).length;
      done += quizzes.filter(q => answeredIds.has(q.id)).length;
      done += exercises.filter(e => codedIds.has(e.id)).length;

      setProgress(done / total);
    });
  }, [material, flashcards, quizzes, exercises]);

  if (!material) return <div className="p-4 text-slate-400">Materiał nie znaleziony</div>;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'info', label: 'Info', count: 0 },
    { key: 'notes', label: 'Notatki', count: 0 },
    { key: 'flashcards', label: 'Fiszki', count: flashcards.length },
    { key: 'quiz', label: 'Quiz', count: quizzes.length },
    { key: 'coding', label: 'Kod', count: exercises.length },
  ];

  return (
    <div>
      <Header title={material.title} showBack />

      {/* Progress ring */}
      <div className="flex items-center gap-3 px-4 py-2">
        <ProgressRing value={progress} size={40} strokeWidth={4} color={
          progress >= 0.8 ? '#10b981' : progress >= 0.4 ? '#f59e0b' : '#3b82f6'
        }>
          <span className="text-[10px] font-bold text-white">{Math.round(progress * 100)}%</span>
        </ProgressRing>
        <span className="text-xs text-slate-400">Postęp materiału</span>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto px-4 py-2 gap-1 no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400',
            )}
          >
            {tab.label}{tab.count > 0 ? ` (${tab.count})` : ''}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {activeTab === 'info' && (
          <Card variant="outlined">
            <p className="text-sm text-slate-300 leading-relaxed">{material.summary}</p>
            <div className="flex flex-wrap gap-1.5 mt-4">
              {material.topics.map((t, i) => (
                <Badge key={i} size="sm">{t}</Badge>
              ))}
            </div>
          </Card>
        )}

        {activeTab === 'notes' && (
          material.notes ? (
            <FormattedText text={material.notes} className="text-sm text-slate-300" />
          ) : (
            <Card variant="outlined">
              <p className="text-sm text-slate-400 text-center py-4">
                Notatki dla tej lekcji nie są jeszcze dostępne.
              </p>
            </Card>
          )
        )}

        {activeTab === 'flashcards' && (
          <div className="space-y-3">
            <Button onClick={() => navigate(`/fiszki?material=${material.id}`)} fullWidth>
              Rozpocznij sesję ({flashcards.length} fiszek)
            </Button>
            {flashcards.slice(0, 5).map(fc => (
              <Card key={fc.id} variant="default">
                <p className="text-sm text-white font-medium">{fc.front}</p>
                <p className="text-xs text-slate-400 mt-1">{fc.back}</p>
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
                <p className="text-sm text-white">{q.question}</p>
                <Badge variant={q.difficulty === 'easy' ? 'success' : q.difficulty === 'medium' ? 'warning' : 'danger'} size="sm">{q.difficulty}</Badge>
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
                    {ex.difficulty}
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
