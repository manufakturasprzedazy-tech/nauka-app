import { useState } from 'react';
import { motion } from 'framer-motion';
import { FormattedText } from '@/components/ui/FormattedText';
import type { Flashcard } from '@/types/content';

interface FlashcardItemProps {
  card: Flashcard;
  onRate: (rating: 'again' | 'hard' | 'good' | 'easy') => void;
}

export function FlashcardItem({ card, onRate }: FlashcardItemProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="flex flex-col items-center gap-6 w-full px-4">
      {/* Card */}
      <div
        className="flip-card w-full max-w-sm cursor-pointer"
        style={{ minHeight: '280px' }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`flip-card-inner relative w-full h-full ${isFlipped ? 'flipped' : ''}`} style={{ minHeight: '280px' }}>
          {/* Front */}
          <div className="flip-card-front absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 p-6 flex flex-col items-center justify-center shadow-xl">
            <div className="text-xs text-blue-400 font-medium mb-4 uppercase tracking-wider">{card.topic}</div>
            <FormattedText text={card.front} className="text-lg text-white text-center" />
            <div className="mt-6 text-sm text-slate-500">Dotknij aby odkryć</div>
          </div>
          {/* Back */}
          <div className="flip-card-back absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-900/30 to-violet-900/30 border border-blue-700/30 p-6 flex flex-col items-center justify-center shadow-xl">
            <div className="text-xs text-violet-400 font-medium mb-4 uppercase tracking-wider">Odpowiedź</div>
            <FormattedText text={card.back} className="text-lg text-white text-center" />
          </div>
        </div>
      </div>

      {/* Rating buttons — only show when flipped */}
      {isFlipped && (
        <motion.div
          className="flex gap-2 w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <RateButton label="Nie pamiętam" color="bg-red-600" onClick={() => onRate('again')} />
          <RateButton label="Trudne" color="bg-orange-600" onClick={() => onRate('hard')} />
          <RateButton label="Dobrze" color="bg-blue-600" onClick={() => onRate('good')} />
          <RateButton label="Łatwe" color="bg-emerald-600" onClick={() => onRate('easy')} />
        </motion.div>
      )}
    </div>
  );
}

function RateButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`${color} flex-1 py-3 rounded-xl text-xs font-semibold text-white active:scale-95 transition-transform`}
    >
      {label}
    </button>
  );
}
