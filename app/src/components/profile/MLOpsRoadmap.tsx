import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/utils/cn';

interface MLOpsRoadmapProps {
  /** 0-1 progress per stage; undefined = course not available yet */
  stageProgress: (number | undefined)[];
}

const STAGES = [
  { icon: '🐍', name: 'Fundamenty Pythona', desc: 'składnia, funkcje, struktury danych' },
  { icon: '🚀', name: 'Python dla MLOps i AI', desc: 'JSON, API, sekrety, testy, LLM' },
  { icon: '📊', name: 'Praca z danymi', desc: 'pandas, NumPy, wizualizacja' },
  { icon: '🧠', name: 'Podstawy ML', desc: 'scikit-learn, trenowanie modeli' },
  { icon: '⚙️', name: 'MLOps w praktyce', desc: 'Docker, CI/CD, deployment, monitoring' },
];

/** Career roadmap — anchors daily grind to the long-term goal (MLOps / AI automation) */
export function MLOpsRoadmap({ stageProgress }: MLOpsRoadmapProps) {
  // Current stage = first available stage that isn't finished
  let currentIdx = STAGES.findIndex((_, i) => stageProgress[i] !== undefined && (stageProgress[i] ?? 0) < 0.999);
  if (currentIdx === -1) currentIdx = 0;

  return (
    <Card variant="default">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">🎯 Twoja droga do MLOps</h3>
        <span className="text-[10px] text-slate-500 tnum">etap {currentIdx + 1}/{STAGES.length}</span>
      </div>
      <div className="space-y-3">
        {STAGES.map((stage, i) => {
          const progress = stageProgress[i];
          const available = progress !== undefined;
          const isCurrent = i === currentIdx;
          return (
            <div key={stage.name} className={cn('flex items-start gap-3', !available && 'opacity-45')}>
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-base',
                  isCurrent
                    ? 'border-indigo-500/40 bg-indigo-500/15 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                    : 'border-slate-400/10 bg-white/[0.03]',
                )}
              >
                {available && (progress ?? 0) >= 0.999 ? '✅' : stage.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={cn('text-sm font-semibold', isCurrent ? 'text-white' : 'text-slate-400')}>
                    {stage.name}
                  </p>
                  {!available && <span className="text-[9px] uppercase tracking-wider text-slate-600">wkrótce</span>}
                </div>
                <p className="text-[11px] text-slate-500">{stage.desc}</p>
                {available && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <ProgressBar value={progress ?? 0} size="sm" className="flex-1" />
                    <span className="text-[10px] font-bold text-indigo-300 tnum">{Math.round((progress ?? 0) * 100)}%</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        Każda fiszka i każdy quiz to krok w stronę pracy z AI. Kolejne etapy pojawią się jako nowe kursy.
      </p>
    </Card>
  );
}
