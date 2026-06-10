import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PathNode, type NodeState } from './PathNode';
import type { MaterialProgress } from '@/hooks/useMaterialProgress';

interface LearningPathProps {
  courseId: string;
  items: MaterialProgress[];
  freeMode: boolean; // when true, locking is disabled
}

const COMPLETED_AT = 0.999;
const UNLOCK_AT = 0.6;

/** Vertical serpentine path of lesson nodes — Duolingo style */
export function LearningPath({ courseId, items, freeMode }: LearningPathProps) {
  const navigate = useNavigate();
  const currentRef = useRef<HTMLDivElement>(null);

  // Node states: completed / current (first unlocked, not completed) / available / locked
  const states: NodeState[] = [];
  let currentAssigned = false;
  for (let i = 0; i < items.length; i++) {
    const percent = items[i].percent;
    const prevPercent = i === 0 ? 1 : items[i - 1].percent;
    const unlocked = freeMode || i === 0 || prevPercent >= UNLOCK_AT;

    if (percent >= COMPLETED_AT) {
      states.push('completed');
    } else if (unlocked && !currentAssigned) {
      states.push('current');
      currentAssigned = true;
    } else if (unlocked) {
      states.push('available');
    } else {
      states.push('locked');
    }
  }

  useEffect(() => {
    // Scroll the current node into view on mount
    const timer = setTimeout(() => {
      currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative py-4">
      {items.map((item, i) => {
        // Serpentine: sine-wave horizontal offset
        const offset = Math.round(Math.sin((i * Math.PI) / 3) * 72);
        const state = states[i];
        return (
          <motion.div
            key={item.material.id}
            ref={state === 'current' ? currentRef : undefined}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.4) }}
            className="flex justify-center py-3"
            style={{ transform: `translateX(${offset}px)` }}
          >
            <PathNode
              index={i}
              title={item.material.title}
              state={state}
              percent={item.percent}
              onClick={() => {
                if (state === 'locked') return;
                navigate(`/kursy/${courseId}/${item.material.id}`);
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
