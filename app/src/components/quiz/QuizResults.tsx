import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Confetti } from '@/components/ui/Confetti';

interface QuizResultsProps {
  score: number;
  total: number;
  xpEarned?: number;
  bestCombo?: number;
  onRetry: () => void;
  onBack: () => void;
}

export function QuizResults({ score, total, xpEarned, bestCombo, onRetry, onBack }: QuizResultsProps) {
  const percent = total > 0 ? score / total : 0;
  const color = percent >= 0.8 ? '#10b981' : percent >= 0.5 ? '#f59e0b' : '#f43f5e';
  const perfect = percent === 1 && total >= 5;

  return (
    <motion.div
      className="flex flex-col items-center justify-center px-6 py-12 gap-7"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Confetti active={percent >= 0.8} />
      <h2 className="text-2xl font-extrabold text-white">{perfect ? 'Perfekcyjnie! 🏆' : 'Wyniki'}</h2>

      <ProgressRing value={percent} size={160} strokeWidth={12} color={color} gradient={false}>
        <div className="text-center">
          <div className="text-3xl font-extrabold text-white tnum">{Math.round(percent * 100)}%</div>
          <div className="text-sm text-slate-400 tnum">{score} / {total}</div>
        </div>
      </ProgressRing>

      <div className="text-center">
        {percent >= 0.8 && <p className="text-emerald-400 text-lg font-semibold">Świetny wynik!</p>}
        {percent >= 0.5 && percent < 0.8 && <p className="text-amber-400 text-lg font-semibold">Dobra robota!</p>}
        {percent < 0.5 && <p className="text-rose-400 text-lg font-semibold">Powtórz materiał i spróbuj ponownie</p>}
        <div className="mt-2 flex items-center justify-center gap-3">
          <span className="font-mono text-sm font-bold text-gradient tnum">+{xpEarned ?? score * 10} XP</span>
          {bestCombo !== undefined && bestCombo >= 3 && (
            <span className="font-mono text-sm font-bold text-amber-400 tnum">⚡ combo x{bestCombo}</span>
          )}
        </div>
      </div>

      <div className="flex gap-3 w-full max-w-xs">
        <Button variant="secondary" onClick={onBack} fullWidth>Wróć</Button>
        <Button onClick={onRetry} fullWidth>Ponów</Button>
      </div>
    </motion.div>
  );
}
