import { useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { MaterialCard } from '@/components/courses/MaterialCard';
import { useContentStore } from '@/stores/contentStore';

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { getCourse, getMaterialsByCourse } = useContentStore();

  const course = getCourse(courseId!);
  const materials = getMaterialsByCourse(courseId!);

  if (!course) {
    return <div className="p-4 text-slate-400">Kurs nie znaleziony</div>;
  }

  return (
    <div>
      <Header title={course.name} showBack />
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{course.icon}</span>
          <div>
            <h2 className="text-lg font-bold text-white">{course.name}</h2>
            <p className="text-sm text-slate-400">{materials.length} lekcji</p>
          </div>
        </div>
        {materials.map(material => (
          <MaterialCard key={material.id} material={material} courseId={courseId!} />
        ))}
      </div>
    </div>
  );
}
