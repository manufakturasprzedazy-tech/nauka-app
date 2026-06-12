import { motion } from 'framer-motion';

export interface TestOutcome {
  passed: boolean; // all asserts green
  passRate: number; // 0-1
  feedback: string;
  errors?: string[];
  testResults?: { test: string; passed: boolean; error?: string | null }[];
  noTests?: boolean;
}

interface CodeFeedbackProps {
  outcome: TestOutcome;
  xpEarned: number;
}

export function CodeFeedback({ outcome, xpEarned }: CodeFeedbackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Verdict */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-white text-sm font-bold ${
              outcome.noTests ? 'bg-slate-600' : outcome.passed ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
          >
            {outcome.noTests ? 'Bez testów' : outcome.passed ? '✓ Zaliczone' : '✗ Niezaliczone'}
          </span>
          {!outcome.noTests && !outcome.passed && outcome.testResults && (
            <span className="text-sm text-slate-300 font-medium tnum">
              {outcome.testResults.filter(t => t.passed).length}/{outcome.testResults.length} testów
            </span>
          )}
        </div>
        {xpEarned > 0 && <span className="font-mono text-emerald-400 font-bold text-sm tnum">+{xpEarned} XP</span>}
      </div>

      {/* Feedback */}
      <p className="text-sm text-slate-300 leading-relaxed">{outcome.feedback}</p>

      {/* Errors */}
      {outcome.errors && outcome.errors.length > 0 && (
        <div>
          <span className="text-xs text-rose-400 block mb-1">Błędy</span>
          <div className="space-y-1">
            {outcome.errors.map((err, i) => (
              <div key={i} className="text-xs text-rose-300 bg-rose-900/20 border border-rose-800/30 rounded px-2 py-1 font-mono break-all">
                {err}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test results */}
      {outcome.testResults && outcome.testResults.length > 0 && (
        <div>
          <span className="text-xs text-slate-400 block mb-1">
            Testy ({outcome.testResults.filter(t => t.passed).length}/{outcome.testResults.length})
          </span>
          <div className="space-y-1">
            {outcome.testResults.map((t, i) => (
              <div key={i} className={`text-xs font-mono px-2 py-1 rounded break-all ${
                t.passed
                  ? 'text-emerald-300 bg-emerald-900/20 border border-emerald-800/30'
                  : 'text-rose-300 bg-rose-900/20 border border-rose-800/30'
              }`}>
                <span className="mr-1">{t.passed ? '✓' : '✗'}</span>
                {t.test}
                {!t.passed && t.error && <span className="block text-[10px] opacity-80 mt-0.5">{t.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
