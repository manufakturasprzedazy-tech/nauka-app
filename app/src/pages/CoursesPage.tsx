import { Header } from '@/components/layout/Header';
import { CourseCard } from '@/components/courses/CourseCard';
import { useContentStore } from '@/stores/contentStore';

export function CoursesPage() {
  const { courses, materials } = useContentStore();

  return (
    <div>
      <Header title="Kursy" />
      <div className="px-4 py-4 space-y-3">
        {courses.map(course => (
          <CourseCard
            key={course.id}
            course={course}
            materialCount={materials.filter(m => m.courseId === course.id).length}
          />
        ))}
      </div>
    </div>
  );
}
