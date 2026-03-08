import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useContentStore } from '@/stores/contentStore';

export function CodingPage() {
  const navigate = useNavigate();
  const { exercises, getMaterial } = useContentStore();

  // Group by material
  const grouped = new Map<number, typeof exercises>();
  exercises.forEach(ex => {
    const arr = grouped.get(ex.materialId) || [];
    arr.push(ex);
    grouped.set(ex.materialId, arr);
  });

  return (
    <div>
      <Header title="Kodowanie" />
      <div className="px-4 py-4 space-y-4">
        <p className="text-sm text-slate-400">{exercises.length} ćwiczeń kodowania</p>
        {Array.from(grouped.entries()).map(([materialId, exList]) => {
          const material = getMaterial(materialId);
          return (
            <div key={materialId}>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                {material?.title ?? `Materiał ${materialId}`}
              </h3>
              <div className="space-y-2">
                {exList.map(ex => (
                  <Card
                    key={ex.id}
                    variant="default"
                    className="cursor-pointer active:scale-[0.98] transition-transform"
                    onClick={() => navigate(`/kodowanie/${ex.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white font-medium truncate">{ex.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{ex.topic}</p>
                      </div>
                      <Badge
                        variant={ex.difficulty === 'easy' ? 'success' : ex.difficulty === 'medium' ? 'warning' : 'danger'}
                        size="sm"
                      >
                        {ex.difficulty}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
