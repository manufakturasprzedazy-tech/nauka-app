import { motion, type TargetAndTransition } from 'framer-motion';

export type MascotMood = 'idle' | 'happy' | 'celebrate' | 'thinking' | 'sleepy';

interface PySnakeProps {
  mood?: MascotMood;
  size?: number;
}

const bodyAnimations: Record<MascotMood, TargetAndTransition> = {
  idle: { y: [0, -4, 0], transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } },
  happy: { y: [0, -10, 0], transition: { duration: 0.5, repeat: 2, ease: 'easeOut' } },
  celebrate: { rotate: [0, -8, 8, -8, 0], scale: [1, 1.1, 1], transition: { duration: 0.7, repeat: 1 } },
  thinking: { rotate: [0, 3, 0, -3, 0], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
  sleepy: { y: [0, 2, 0], transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' } },
};

/**
 * Py — the Python snake mascot. Pure inline SVG, geometric and friendly:
 * coiled gradient body, big eyes (baby-schema effect), little tongue.
 */
export function PySnake({ mood = 'idle', size = 96 }: PySnakeProps) {
  const eyesClosed = mood === 'sleepy';

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      animate={bodyAnimations[mood]}
      style={{ originX: '50%', originY: '80%' }}
    >
      <defs>
        <linearGradient id="py-body" x1="20" y1="100" x2="100" y2="20">
          <stop stopColor="#4f46e5" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="py-belly" x1="40" y1="90" x2="80" y2="40">
          <stop stopColor="#818cf8" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>

      {/* Tail coil */}
      <path
        d="M 30 95 Q 12 95 14 80 Q 16 66 34 68"
        stroke="url(#py-body)"
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />
      {/* Body coil */}
      <path
        d="M 34 68 Q 60 76 84 68 Q 104 60 96 44"
        stroke="url(#py-body)"
        strokeWidth="18"
        strokeLinecap="round"
        fill="none"
      />
      {/* Neck up to head */}
      <path
        d="M 96 44 Q 90 30 72 30"
        stroke="url(#py-body)"
        strokeWidth="18"
        strokeLinecap="round"
        fill="none"
      />

      {/* Head */}
      <ellipse cx="58" cy="32" rx="22" ry="19" fill="url(#py-belly)" />

      {/* Eyes */}
      {eyesClosed ? (
        <>
          <path d="M 46 30 q 4 4 8 0" stroke="#1e1b4b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M 62 30 q 4 4 8 0" stroke="#1e1b4b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="50" cy="29" r="7" fill="white" />
          <circle cx="66" cy="29" r="7" fill="white" />
          <motion.g
            animate={mood === 'thinking' ? { x: [0, 2.5, 0, -2.5, 0] } : { x: 0 }}
            transition={{ duration: 3, repeat: mood === 'thinking' ? Infinity : 0 }}
          >
            <circle cx="51.5" cy="30" r="3.5" fill="#1e1b4b" />
            <circle cx="67.5" cy="30" r="3.5" fill="#1e1b4b" />
            <circle cx="52.8" cy="28.6" r="1.2" fill="white" />
            <circle cx="68.8" cy="28.6" r="1.2" fill="white" />
          </motion.g>
        </>
      )}

      {/* Smile */}
      <path
        d={mood === 'happy' || mood === 'celebrate' ? 'M 50 41 q 8 7 16 0' : 'M 51 41 q 7 4 14 0'}
        stroke="#1e1b4b"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Tongue */}
      <motion.path
        d="M 40 36 q -7 1 -9 5 M 40 36 q -7 -2 -10 -1"
        stroke="#f43f5e"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        animate={{ opacity: [0, 1, 1, 0], x: [0, -2, -2, 0] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 2.5 }}
      />

      {/* Celebrate sparkles */}
      {mood === 'celebrate' && (
        <motion.g
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 1.4] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          <path d="M 20 24 l 2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" fill="#fbbf24" />
          <path d="M 100 70 l 1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5 z" fill="#34d399" />
          <circle cx="104" cy="22" r="3" fill="#f472b6" />
        </motion.g>
      )}

      {/* Sleepy Zzz */}
      {eyesClosed && (
        <motion.g
          animate={{ opacity: [0, 1, 0], y: [-2, -8] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        >
          <text x="86" y="18" fill="#94a3b8" fontSize="12" fontWeight="bold">z</text>
          <text x="94" y="10" fill="#94a3b8" fontSize="9" fontWeight="bold">z</text>
        </motion.g>
      )}
    </motion.svg>
  );
}
