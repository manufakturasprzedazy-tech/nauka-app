import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { ensureTodayQuests, getTemplate, ALL_QUESTS_BONUS } from '@/services/questService';
import { cn } from '@/utils/cn';
import type { DailyQuest } from '@/types/progress';

export function DailyQuests() {
  const [quests, setQuests] = useState<DailyQuest[]>([]);

  useEffect(() => {
    ensureTodayQuests().then(setQuests);
  }, []);

  if (quests.length === 0) return null;

  const allDone = quests.every(q => q.completed);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Dzisiejsze questy</h2>
        {allDone ? (
          <span className="text-xs font-bold text-emerald-400">✓ Komplet! +{ALL_QUESTS_BONUS} XP</span>
        ) : (
          <span className="text-xs text-slate-500 tnum">{quests.filter(q => q.completed).length}/{quests.length}</span>
        )}
      </div>
      <Card variant="default" padding="sm" className="divide-y divide-slate-400/10">
        {quests.map((quest, i) => {
          const tpl = getTemplate(quest.questId);
          if (!tpl) return null;
          const progress = Math.min(1, quest.progress / quest.target);
          return (
            <motion.div
              key={quest.questId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3 px-1 py-2.5"
            >
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-base',
                  quest.completed
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : 'border-slate-400/10 bg-white/[0.03]',
                )}
              >
                {quest.completed ? '✅' : tpl.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-medium', quest.completed ? 'text-slate-500 line-through' : 'text-white')}>
                  {tpl.label}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        quest.completed ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500',
                      )}
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 tnum whitespace-nowrap">
                    {quest.progress}/{quest.target}
                  </span>
                </div>
              </div>
              <span className={cn('font-mono text-xs font-bold tnum', quest.completed ? 'text-emerald-400' : 'text-slate-500')}>
                +{tpl.reward}
              </span>
            </motion.div>
          );
        })}
      </Card>
    </div>
  );
}
