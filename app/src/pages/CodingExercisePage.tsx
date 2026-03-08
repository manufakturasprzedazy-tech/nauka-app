import { useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { CodingExerciseView } from '@/components/coding/CodingExercise';
import { useContentStore } from '@/stores/contentStore';

export function CodingExercisePage() {
  const { id } = useParams<{ id: string }>();
  const { exercises } = useContentStore();
  const exercise = exercises.find(e => e.id === Number(id));

  if (!exercise) {
    return <div className="p-4 text-slate-400">Ćwiczenie nie znalezione</div>;
  }

  return (
    <div>
      <Header title={exercise.title} showBack />
      <CodingExerciseView exercise={exercise} />
    </div>
  );
}
