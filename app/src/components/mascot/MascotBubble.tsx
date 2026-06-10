import { motion } from 'framer-motion';
import { PySnake, type MascotMood } from './PySnake';

interface MascotBubbleProps {
  message: string;
  mood?: MascotMood;
  size?: number;
}

/** Py + speech bubble side by side */
export function MascotBubble({ message, mood = 'idle', size = 72 }: MascotBubbleProps) {
  return (
    <div className="flex items-center gap-2">
      <PySnake mood={mood} size={size} />
      <motion.div
        initial={{ opacity: 0, scale: 0.85, x: -6 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ delay: 0.15, type: 'spring', damping: 18 }}
        className="relative flex-1 rounded-2xl rounded-bl-sm border border-slate-400/15 bg-[#181826] px-3.5 py-2.5"
      >
        <p className="text-sm text-slate-200 leading-snug">{message}</p>
      </motion.div>
    </div>
  );
}
