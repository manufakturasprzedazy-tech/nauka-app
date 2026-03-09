import type { ReactNode } from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

function isCodeBlock(block: string): boolean {
  const lines = block.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return false;

  const codePatterns = [
    /^\s{2,}/, // indentation
    /^(def |class |import |from |if |elif |else:|for |while |return |try:|except |with |raise |pass|break|continue)/,
    /print\(/, /len\(/, /range\(/, /input\(/,
    /\w+\s*=\s*.+/, // assignment
    /\w+\.\w+\(/, // method call
    /\[.*\]/, // list/index
    /\{.*\}/, // dict
    /#\s/, // comment
    /:\s*$/, // colon at end
    /^\s*@/, // decorator
    /lambda\s/, /assert\s/,
    /True|False|None/,
    /def\s+\w+\(/, /class\s+\w+/,
    />>>\s/, // REPL
  ];

  let codeLineCount = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (codePatterns.some(p => p.test(trimmed)) || codePatterns.some(p => p.test(line))) {
      codeLineCount++;
    }
  }

  return codeLineCount / lines.length >= 0.4;
}

/** Parse inline backtick code within a text string */
function renderInlineCode(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(`[^`\n]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={`${keyPrefix}-${i}`}
          className="bg-slate-800/60 px-1.5 py-0.5 rounded text-emerald-300 font-mono text-[0.9em]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part ? <span key={`${keyPrefix}-${i}`}>{part}</span> : null;
  });
}

/** Check if text contains markdown-style code formatting */
function hasMarkdownCode(text: string): boolean {
  return /```/.test(text) || /`[^`\n]+`/.test(text);
}

/** Render text with markdown backtick support */
function renderMarkdown(text: string, className: string) {
  // Split by triple-backtick code blocks
  const parts = text.split(/(```(?:\w*)\n[\s\S]*?```)/g);

  const elements: ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    // Triple-backtick code block
    const codeBlockMatch = part.match(/^```(?:\w*)\n([\s\S]*?)```$/);
    if (codeBlockMatch) {
      elements.push(
        <pre
          key={i}
          className="bg-slate-800/60 rounded-lg p-3 my-2 overflow-x-auto font-mono text-sm text-emerald-300 leading-relaxed whitespace-pre"
        >
          {codeBlockMatch[1].trimEnd()}
        </pre>
      );
      continue;
    }

    // Text block — split by double newlines into paragraphs
    const paragraphs = part.split(/\n\n+/);
    for (let j = 0; j < paragraphs.length; j++) {
      const para = paragraphs[j].trim();
      if (!para) continue;

      elements.push(
        <p key={`${i}-${j}`} className="leading-relaxed">
          {renderInlineCode(para, `${i}-${j}`)}
        </p>
      );
    }
  }

  return <div className={className}>{elements}</div>;
}

/** Render with auto-detection fallback (for old content without backticks) */
function renderAutoDetect(text: string, className: string) {
  const blocks = text.split(/\n\n+/);

  return (
    <div className={className}>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (isCodeBlock(trimmed)) {
          return (
            <pre
              key={i}
              className="bg-slate-800/60 rounded-lg p-3 my-2 overflow-x-auto font-mono text-sm text-emerald-300 leading-relaxed whitespace-pre"
            >
              {trimmed}
            </pre>
          );
        }

        return (
          <p key={i} className="leading-relaxed">
            {renderInlineCode(trimmed, `auto-${i}`)}
          </p>
        );
      })}
    </div>
  );
}

export function FormattedText({ text, className = '' }: FormattedTextProps) {
  if (hasMarkdownCode(text)) {
    return renderMarkdown(text, className);
  }
  return renderAutoDetect(text, className);
}
