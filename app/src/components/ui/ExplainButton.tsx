import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { FormattedText } from '@/components/ui/FormattedText';
import { useToast } from '@/components/ui/Toast';
import { getSetting } from '@/db/database';
import { explainContent } from '@/services/openaiService';

interface ExplainButtonProps {
  content: string;
  context: 'flashcard' | 'quiz';
}

export function ExplainButton({ content, context }: ExplainButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [explanation, setExplanation] = useState('');
  const [visible, setVisible] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    getSetting('openai_api_key', '').then(setApiKey);
  }, []);

  // Defensive: if state is 'done' but explanation is empty, reset to error
  useEffect(() => {
    if (state === 'done' && !explanation) {
      setState('error');
      setVisible(false);
      showToast('Nie udało się wygenerować wyjaśnienia', '⚠️', 'warning');
    }
  }, [state, explanation, showToast]);

  const handleClick = useCallback(async () => {
    if (state === 'done') {
      setVisible(v => !v);
      return;
    }

    if (!apiKey) {
      showToast('Ustaw klucz API OpenAI w Profilu', '🔑', 'warning');
      return;
    }

    if (state === 'error') {
      setState('idle');
    }

    setState('loading');
    try {
      const result = await explainContent(content, context, apiKey);
      setExplanation(result);
      setState('done');
      setVisible(true);
    } catch (err) {
      setState('error');
      showToast(
        err instanceof Error ? err.message : 'Nie udało się wygenerować wyjaśnienia',
        '⚠️',
        'warning',
      );
    }
  }, [state, apiKey, content, context, showToast]);

  return (
    <div className="w-full">
      <button
        onClick={handleClick}
        disabled={state === 'loading'}
        className="flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-50 mb-2"
      >
        {state === 'loading' ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
            </svg>
            Wyjaśniam...
          </>
        ) : state === 'error' ? (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            Błąd — spróbuj ponownie
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
            {state === 'done' ? (visible ? 'Ukryj wyjaśnienie' : 'Pokaż wyjaśnienie') : 'Wyjaśnij'}
          </>
        )}
      </button>

      <AnimatePresence>
        {visible && explanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card variant="outlined" className="border-l-4 border-l-violet-500">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs font-bold text-violet-400">Wyjaśnienie AI</span>
              </div>
              <FormattedText text={explanation} className="text-sm text-slate-300" />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
