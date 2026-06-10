import { useState } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { FormattedText } from '@/components/ui/FormattedText';
import { ExplainButton } from '@/components/ui/ExplainButton';
import { sounds } from '@/services/soundService';
import { haptics } from '@/services/haptics';
import type { Flashcard } from '@/types/content';

interface FlashcardItemProps {
  card: Flashcard;
  onRate: (rating: 'again' | 'hard' | 'good' | 'easy') => void;
}

const SWIPE_THRESHOLD = 90;

export function FlashcardItem({ card, onRate }: FlashcardItemProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const rightHint = useTransform(x, [20, 120], [0, 1]);
  const leftHint = useTransform(x, [-120, -20], [1, 0]);

  const flip = () => {
    if (!isFlipped) {
      sounds.flip();
      haptics.tap();
    }
    setIsFlipped(!isFlipped);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (!isFlipped) return;
    if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 600) {
      haptics.success();
      onRate('good');
    } else if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -600) {
      haptics.error();
      onRate('again');
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full px-4">
      {/* Swipe hints */}
      {isFlipped && (
        <div className="pointer-events-none fixed inset-x-0 top-1/3 z-30 flex justify-between px-6">
          <motion.div style={{ opacity: leftHint }} className="rounded-2xl border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-sm font-bold text-rose-300">
            ↺ Powtórz
          </motion.div>
          <motion.div style={{ opacity: rightHint }} className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-300">
            Umiem ✓
          </motion.div>
        </div>
      )}

      {/* Card */}
      <motion.div
        className="flip-card w-full max-w-sm cursor-pointer"
        style={{ minHeight: '280px', x, rotate }}
        drag={isFlipped ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        onClick={flip}
      >
        <div className={`flip-card-inner relative w-full h-full ${isFlipped ? 'flipped' : ''}`} style={{ minHeight: '280px' }}>
          {/* Front */}
          <div className="flip-card-front absolute inset-0 rounded-3xl bg-[#10101a] border border-slate-400/15 p-6 flex flex-col items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
            <div className="text-xs text-indigo-300 font-semibold mb-4 uppercase tracking-wider">{card.topic}</div>
            <FormattedText text={card.front} className="text-lg text-white text-center" />
            <div className="mt-6 flex items-center gap-1.5 text-sm text-slate-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Dotknij, aby odkryć
            </div>
          </div>
          {/* Back */}
          <div className="flip-card-back absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-950/80 to-violet-950/60 border border-indigo-500/30 p-6 flex flex-col items-center justify-center shadow-[0_0_24px_rgba(99,102,241,0.2)] overflow-y-auto">
            <div className="text-xs text-violet-300 font-semibold mb-4 uppercase tracking-wider">Odpowiedź</div>
            <FormattedText text={card.back} className="text-base text-white text-center" />
          </div>
        </div>
      </motion.div>

      {/* Explain + Rating buttons — only show when flipped */}
      {isFlipped && (
        <motion.div
          className="flex flex-col gap-3 w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-center text-[11px] text-slate-500">Przeciągnij kartę w bok lub oceń:</p>
          <div className="flex gap-2 w-full">
            <RateButton label="Nie pamiętam" cls="bg-rose-600/90 shadow-rose-500/20" onClick={() => onRate('again')} />
            <RateButton label="Trudne" cls="bg-orange-600/90 shadow-orange-500/20" onClick={() => onRate('hard')} />
            <RateButton label="Dobrze" cls="bg-indigo-600/90 shadow-indigo-500/20" onClick={() => onRate('good')} />
            <RateButton label="Łatwe" cls="bg-emerald-600/90 shadow-emerald-500/20" onClick={() => onRate('easy')} />
          </div>
          <ExplainButton
            content={`Przód: ${card.front}\n\nTył: ${card.back}`}
            context="flashcard"
          />
        </motion.div>
      )}
    </div>
  );
}

function RateButton({ label, cls, onClick }: { label: string; cls: string; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); haptics.tap(); onClick(); }}
      className={`${cls} flex-1 py-3 min-h-[48px] rounded-xl text-xs font-semibold text-white active:scale-95 transition-transform shadow-lg`}
    >
      {label}
    </button>
  );
}
