import { motion } from 'framer-motion';
import type { SimilarityResult } from '@/services/textSimilarity';

interface SimilarityFeedbackProps {
  result: SimilarityResult;
  onSelectRating: (rating: number) => void;
}

export function SimilarityFeedback({ result, onSelectRating }: SimilarityFeedbackProps) {
  const coveragePercent = Math.round(result.score * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Coverage bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400">Pokrycie pojęć</span>
          <span className="text-xs font-bold text-white">{coveragePercent}%</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              coveragePercent >= 60 ? 'bg-emerald-500' :
              coveragePercent >= 30 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${coveragePercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Matched keywords */}
      {result.matchedKeywords.length > 0 && (
        <div>
          <span className="text-xs text-slate-400 block mb-1">Dopasowane pojęcia</span>
          <div className="flex flex-wrap gap-1">
            {result.matchedKeywords.map((kw, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 text-xs">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missed keywords */}
      {result.missedKeywords.length > 0 && (
        <div>
          <span className="text-xs text-slate-400 block mb-1">Brakujące pojęcia</span>
          <div className="flex flex-wrap gap-1">
            {result.missedKeywords.map((kw, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full bg-amber-900/40 border border-amber-700/50 text-amber-300 text-xs">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggested rating */}
      <div className="text-center">
        <p className="text-xs text-slate-400 mb-2">
          Sugerowana ocena: <span className="font-bold text-blue-400">{result.suggestedRating}/5</span>
        </p>
        <div className="flex gap-2 justify-center">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => onSelectRating(n)}
              className={`w-12 h-12 rounded-xl border text-white font-bold text-lg active:scale-95 transition-all ${
                n === result.suggestedRating
                  ? 'bg-blue-600 border-blue-500'
                  : 'bg-slate-800 border-slate-700 hover:bg-blue-600 hover:border-blue-500'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
