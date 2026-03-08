import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { ProgressRing } from '@/components/ui/ProgressRing';

interface QuizResultsProps {
  score: number;
  total: number;
  onRetry: () => void;
  onBack: () => void;
}

export function QuizResults({ score, total, onRetry, onBack }: QuizResultsProps) {
  const percent = total > 0 ? score / total : 0;
  const color = percent >= 0.8 ? '#10b981' : percent >= 0.5 ? '#f59e0b' : '#ef4444';

  return (
    <motion.div
      className="flex flex-col items-center justify-center px-6 py-12 gap-8"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <h2 className="text-2xl font-bold text-white">Wyniki</h2>

      <ProgressRing value={percent} size={160} strokeWidth={12} color={color}>
        <div className="text-center">
          <div className="text-3xl font-bold text-white">{Math.round(percent * 100)}%</div>
          <div className="text-sm text-slate-400">{score} / {total}</div>
        </div>
      </ProgressRing>

      <div className="text-center">
        {percent >= 0.8 && <p className="text-emerald-400 text-lg font-semibold">Świetny wynik!</p>}
        {percent >= 0.5 && percent < 0.8 && <p className="text-amber-400 text-lg font-semibold">Dobra robota!</p>}
        {percent < 0.5 && <p className="text-red-400 text-lg font-semibold">Spróbuj ponownie</p>}
        <p className="text-slate-400 text-sm mt-1">+{score * 10} XP</p>
      </div>

      <div className="flex gap-3 w-full max-w-xs">
        <Button variant="secondary" onClick={onBack} fullWidth>Wróć</Button>
        <Button onClick={onRetry} fullWidth>Ponów</Button>
      </div>
    </motion.div>
  );
}
