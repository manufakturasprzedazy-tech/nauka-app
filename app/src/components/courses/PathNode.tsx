import { ProgressRing } from '@/components/ui/ProgressRing';
import { haptics } from '@/services/haptics';
import { cn } from '@/utils/cn';

export type NodeState = 'locked' | 'available' | 'current' | 'completed';

interface PathNodeProps {
  index: number;
  title: string;
  state: NodeState;
  percent: number;
  onClick: () => void;
}

export function PathNode({ index, title, state, percent, onClick }: PathNodeProps) {
  const locked = state === 'locked';

  return (
    <button
      onClick={() => {
        if (!locked) haptics.tap();
        onClick();
      }}
      className={cn(
        'flex w-56 flex-col items-center gap-1.5 transition-transform',
        locked ? 'cursor-not-allowed opacity-45' : 'active:scale-95',
      )}
      aria-disabled={locked}
    >
      <div className={cn('relative rounded-full', state === 'current' && 'glow-pulse')}>
        <ProgressRing value={state === 'completed' ? 1 : percent} size={72} strokeWidth={5}>
          <div
            className={cn(
              'flex h-[52px] w-[52px] items-center justify-center rounded-full border text-xl font-extrabold',
              state === 'completed' && 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
              state === 'current' && 'border-indigo-400/50 bg-indigo-500/20 text-white shadow-[0_0_20px_rgba(99,102,241,0.45)]',
              state === 'available' && 'border-slate-400/20 bg-[#181826] text-slate-200',
              state === 'locked' && 'border-slate-400/15 bg-[#10101a] text-slate-500',
            )}
          >
            {state === 'completed' ? '✓' : locked ? '🔒' : index + 1}
          </div>
        </ProgressRing>
        {state === 'current' && (
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-[0_0_12px_rgba(99,102,241,0.6)]">
            Start
          </span>
        )}
      </div>
      <span
        className={cn(
          'line-clamp-2 max-w-[180px] text-center text-xs font-medium leading-tight',
          state === 'current' ? 'text-white' : 'text-slate-400',
        )}
      >
        {title}
      </span>
    </button>
  );
}
