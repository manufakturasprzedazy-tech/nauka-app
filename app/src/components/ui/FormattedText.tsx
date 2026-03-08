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

export function FormattedText({ text, className = '' }: FormattedTextProps) {
  // Split on double newlines to get blocks
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
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}
