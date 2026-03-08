import { useEffect, useRef } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { basicSetup } from 'codemirror';

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
}

export function CodeEditor({ value, onChange, readOnly = false, height = '250px' }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        python(),
        oneDark,
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.theme({
          '&': { height, fontSize: '14px' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { padding: '8px 0' },
        }),
        ...(readOnly ? [EditorState.readOnly.of(true)] : []),
        ...(onChange ? [EditorView.updateListener.of(update => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        })] : []),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => { view.destroy(); };
    // Only recreate on readOnly change, not value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly]);

  // Update content when value changes externally
  useEffect(() => {
    const view = viewRef.current;
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div ref={containerRef} className="rounded-xl overflow-hidden border border-slate-700/50" />
  );
}
