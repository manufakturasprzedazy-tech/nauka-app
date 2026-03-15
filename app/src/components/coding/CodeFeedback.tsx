import { motion } from 'framer-motion';
import type { CodeComparisonResult } from '@/services/codeComparison';

interface CodeFeedbackProps {
  result: CodeComparisonResult;
  xpEarned: number;
}

const scoreColors: Record<number, string> = {
  5: 'bg-emerald-600',
  4: 'bg-blue-600',
  3: 'bg-amber-600',
  2: 'bg-orange-600',
  1: 'bg-red-600',
};

const scoreLabels: Record<number, string> = {
  5: 'Doskonale',
  4: 'Bardzo dobrze',
  3: 'Dobrze',
  2: 'Do poprawy',
  1: 'Spróbuj jeszcze',
};

export function CodeFeedback({ result, xpEarned }: CodeFeedbackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Score badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-white text-sm font-bold ${scoreColors[result.score]}`}>
            {result.score}/5
          </span>
          <span className="text-sm text-slate-300 font-medium">{scoreLabels[result.score]}</span>
        </div>
        <span className="text-emerald-400 font-bold text-sm">+{xpEarned} XP</span>
      </div>

      {/* Feedback */}
      <p className="text-sm text-slate-300 leading-relaxed">{result.feedback}</p>

      {/* Errors */}
      {result.errors && result.errors.length > 0 && (
        <div>
          <span className="text-xs text-red-400 block mb-1">Błędy</span>
          <div className="space-y-1">
            {result.errors.map((err, i) => (
              <div key={i} className="text-xs text-red-300 bg-red-900/20 border border-red-800/30 rounded px-2 py-1 font-mono break-all">
                {err}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test results */}
      {result.testResults && result.testResults.length > 0 && (
        <div>
          <span className="text-xs text-slate-400 block mb-1">
            Testy ({result.testResults.filter(t => t.passed).length}/{result.testResults.length})
          </span>
          <div className="space-y-1">
            {result.testResults.map((t, i) => (
              <div key={i} className={`text-xs font-mono px-2 py-1 rounded break-all ${
                t.passed
                  ? 'text-emerald-300 bg-emerald-900/20 border border-emerald-800/30'
                  : 'text-red-300 bg-red-900/20 border border-red-800/30'
              }`}>
                <span className="mr-1">{t.passed ? '✓' : '✗'}</span>
                {t.test}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matched concepts */}
      {result.matchedConcepts.length > 0 && (
        <div>
          <span className="text-xs text-slate-400 block mb-1">Użyte koncepcje</span>
          <div className="flex flex-wrap gap-1">
            {result.matchedConcepts.map((c, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 text-xs">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missed concepts */}
      {result.missedConcepts.length > 0 && (
        <div>
          <span className="text-xs text-slate-400 block mb-1">Brakujące koncepcje</span>
          <div className="flex flex-wrap gap-1">
            {result.missedConcepts.map((c, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full bg-amber-900/40 border border-amber-700/50 text-amber-300 text-xs">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
