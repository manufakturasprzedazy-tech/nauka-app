import { cn } from '@/utils/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-full border transition-all duration-200',
        checked
          ? 'border-indigo-500/50 bg-indigo-600 shadow-[0_0_12px_rgba(99,102,241,0.4)]'
          : 'border-slate-400/20 bg-white/10',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white shadow transition-all duration-200',
          checked ? 'left-[22px]' : 'left-0.5',
        )}
      />
    </button>
  );
}
