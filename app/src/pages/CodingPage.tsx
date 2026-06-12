import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useContentStore } from '@/stores/contentStore';
import { getStartedMaterialIds } from '@/services/progressService';
import { db } from '@/db/database';

export function CodingPage() {
  const navigate = useNavigate();
  const { exercises, getMaterial } = useContentStore();
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [startedIds, setStartedIds] = useState<Set<number> | null>(null);

  useEffect(() => {
    db.codingAttempts.toArray().then(attempts => {
      setCompletedIds(new Set(attempts.filter(a => a.completed).map(a => a.exerciseId)));
    });
    getStartedMaterialIds().then(setStartedIds);
  }, []);

  // Practice scope: only exercises from started lessons (consistent with other modes)
  const visible = startedIds ? exercises.filter(ex => startedIds.has(ex.materialId)) : [];

  // Group by material
  const grouped = new Map<number, typeof exercises>();
  visible.forEach(ex => {
    const arr = grouped.get(ex.materialId) || [];
    arr.push(ex);
    grouped.set(ex.materialId, arr);
  });

  const doneCount = visible.filter(ex => completedIds.has(ex.id)).length;

  return (
    <div>
      <Header title="Kodowanie" />
      <div className="px-4 py-4 space-y-4">
        <p className="text-sm text-slate-400 tnum">
          {doneCount}/{visible.length} ćwiczeń rozwiązanych · kolejne pojawią się wraz z postępem na ścieżce
        </p>
        {Array.from(grouped.entries()).map(([materialId, exList]) => {
          const material = getMaterial(materialId);
          return (
            <div key={materialId}>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                {material?.title ?? `Materiał ${materialId}`}
              </h3>
              <div className="space-y-2">
                {exList.map(ex => {
                  const done = completedIds.has(ex.id);
                  return (
                    <Card
                      key={ex.id}
                      variant="default"
                      className={`cursor-pointer active:scale-[0.98] transition-transform ${done ? 'border-emerald-500/25' : ''}`}
                      onClick={() => navigate(`/kodowanie/${ex.id}`)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          {done && <span className="shrink-0 text-emerald-400">✓</span>}
                          <div className="min-w-0">
                            <p className="text-sm text-white font-medium truncate">{ex.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">{ex.topic}</p>
                          </div>
                        </div>
                        <Badge
                          variant={ex.difficulty === 'easy' ? 'success' : ex.difficulty === 'medium' ? 'warning' : 'danger'}
                          size="sm"
                        >
                          {ex.difficulty === 'easy' ? 'łatwe' : ex.difficulty === 'medium' ? 'średnie' : 'trudne'}
                        </Badge>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
