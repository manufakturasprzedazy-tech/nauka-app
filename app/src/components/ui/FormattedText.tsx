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

/** Premium code block with language label bar */
function CodeBlock({ lang, code }: { lang: string; code: string }) {
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-slate-400/10 bg-[#0c0c14]">
      <div className="flex items-center justify-between border-b border-slate-400/10 bg-white/[0.03] px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-500/60" />
          <span className="h-2 w-2 rounded-full bg-amber-500/60" />
          <span className="h-2 w-2 rounded-full bg-emerald-500/60" />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{lang}</span>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[13px] leading-relaxed text-emerald-300 whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

/** Parse inline formatting: `code` and **bold** */
function renderInlineFormatting(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(`[^`\n]+`|\*\*[^*]+\*\*)/g);
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
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={`${keyPrefix}-${i}`} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part ? <span key={`${keyPrefix}-${i}`}>{part}</span> : null;
  });
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

/** Check if text contains markdown formatting */
function hasMarkdown(text: string): boolean {
  return /```/.test(text) || /`[^`\n]+`/.test(text) || /^#{2,3}\s/m.test(text) || /\*\*[^*]+\*\*/.test(text);
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
    const codeBlockMatch = part.match(/^```(\w*)\n([\s\S]*?)```$/);
    if (codeBlockMatch) {
      elements.push(
        <CodeBlock key={i} lang={codeBlockMatch[1] || 'python'} code={codeBlockMatch[2].trimEnd()} />
      );
      continue;
    }

    // Text block — parse line by line for headers, bullets, paragraphs
    const lines = part.split('\n');
    let bulletBuffer: ReactNode[] = [];
    let bulletKeyBase = '';

    const flushBullets = () => {
      if (bulletBuffer.length > 0) {
        elements.push(
          <ul key={bulletKeyBase} className="list-disc ml-4 space-y-1">
            {bulletBuffer}
          </ul>
        );
        bulletBuffer = [];
      }
    };

    for (let j = 0; j < lines.length; j++) {
      const line = lines[j];
      const trimmed = line.trim();
      if (!trimmed) {
        flushBullets();
        continue;
      }

      // ## Header
      if (trimmed.startsWith('## ')) {
        flushBullets();
        elements.push(
          <h2 key={`${i}-h2-${j}`} className="text-lg font-bold text-white mt-5 mb-2">
            {renderInlineFormatting(trimmed.slice(3), `${i}-h2-${j}`)}
          </h2>
        );
        continue;
      }

      // ### Subheader
      if (trimmed.startsWith('### ')) {
        flushBullets();
        elements.push(
          <h3 key={`${i}-h3-${j}`} className="text-base font-semibold text-indigo-300 mt-4 mb-1">
            {renderInlineFormatting(trimmed.slice(4), `${i}-h3-${j}`)}
          </h3>
        );
        continue;
      }

      // - bullet
      if (trimmed.startsWith('- ')) {
        if (bulletBuffer.length === 0) bulletKeyBase = `${i}-ul-${j}`;
        bulletBuffer.push(
          <li key={`${i}-li-${j}`} className="leading-relaxed">
            {renderInlineFormatting(trimmed.slice(2), `${i}-li-${j}`)}
          </li>
        );
        continue;
      }

      // Regular text line
      flushBullets();
      elements.push(
        <p key={`${i}-${j}`} className="leading-relaxed">
          {renderInlineFormatting(trimmed, `${i}-${j}`)}
        </p>
      );
    }
    flushBullets();
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
          return <CodeBlock key={i} lang="python" code={trimmed} />;
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
  if (hasMarkdown(text)) {
    return renderMarkdown(text, className);
  }
  return renderAutoDetect(text, className);
}
