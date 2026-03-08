import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { Course } from '@/types/content';

interface CourseCardProps {
  course: Course;
  materialCount: number;
  progress?: number;
}

export function CourseCard({ course, materialCount, progress = 0 }: CourseCardProps) {
  return (
    <Link to={`/kursy/${course.id}`}>
      <Card variant="elevated" className="active:scale-[0.98] transition-transform">
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ backgroundColor: course.color + '20' }}
          >
            {course.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-base">{course.name}</h3>
            <p className="text-slate-400 text-sm mt-0.5 line-clamp-2">{course.description}</p>
            <div className="flex items-center gap-2 mt-3">
              <ProgressBar value={progress} size="sm" color={course.color} className="flex-1" />
              <span className="text-xs text-slate-500 whitespace-nowrap">{materialCount} lekcji</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
