import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Material } from '@/types/content';

interface MaterialCardProps {
  material: Material;
  courseId: string;
}

export function MaterialCard({ material, courseId }: MaterialCardProps) {
  return (
    <Link to={`/kursy/${courseId}/${material.id}`}>
      <Card variant="default" className="active:scale-[0.98] transition-transform hover:bg-slate-800/60">
        <h3 className="text-white font-semibold text-sm leading-tight mb-2">{material.title}</h3>
        <div className="flex flex-wrap gap-1.5">
          {material.flashcardCount > 0 && (
            <Badge variant="info" size="sm">{material.flashcardCount} fiszek</Badge>
          )}
          {material.quizCount > 0 && (
            <Badge variant="success" size="sm">{material.quizCount} pytań</Badge>
          )}
          {material.exerciseCount > 0 && (
            <Badge variant="warning" size="sm">{material.exerciseCount} ćwiczeń</Badge>
          )}
        </div>
      </Card>
    </Link>
  );
}
