export interface TestResult {
  test: string;
  passed: boolean;
  error?: string;
}

export interface CodeComparisonResult {
  score: number; // 1-5
  feedback: string;
  matchedConcepts: string[];
  missedConcepts: string[];
  errors?: string[];
  testResults?: TestResult[];
}

function tokenize(code: string): string[] {
  return code
    .replace(/\s+/g, ' ')
    .replace(/[(){}[\]:;,'"]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(t => t.length >= 2);
}

function extractConcepts(code: string): Set<string> {
  const concepts = new Set<string>();
  const lines = code.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Function defs
    const funcMatch = trimmed.match(/def\s+(\w+)/);
    if (funcMatch) concepts.add(`def:${funcMatch[1]}`);
    // For loops
    if (/\bfor\b/.test(trimmed)) concepts.add('loop:for');
    // While loops
    if (/\bwhile\b/.test(trimmed)) concepts.add('loop:while');
    // Conditionals
    if (/\bif\b/.test(trimmed)) concepts.add('conditional');
    // List comprehension
    if (/\[.*\bfor\b.*\bin\b.*\]/.test(trimmed)) concepts.add('list_comprehension');
    // Return
    if (/\breturn\b/.test(trimmed)) concepts.add('return');
    // Print
    if (/\bprint\s*\(/.test(trimmed)) concepts.add('print');
    // Common builtins
    for (const fn of ['len', 'range', 'enumerate', 'zip', 'map', 'filter', 'sorted', 'input', 'int', 'str', 'list', 'dict', 'set', 'append', 'join', 'split', 'strip']) {
      if (new RegExp(`\\b${fn}\\b`).test(trimmed)) concepts.add(`builtin:${fn}`);
    }
    // Try/except
    if (/\btry\s*:/.test(trimmed)) concepts.add('try_except');
    if (/\bexcept\b/.test(trimmed)) concepts.add('try_except');
    // Class
    const classMatch = trimmed.match(/class\s+(\w+)/);
    if (classMatch) concepts.add(`class:${classMatch[1]}`);
    // Import
    if (/\bimport\b/.test(trimmed)) concepts.add('import');
    // Lambda
    if (/\blambda\b/.test(trimmed)) concepts.add('lambda');
  }

  return concepts;
}

export function compareCode(userCode: string, solutionCode: string): CodeComparisonResult {
  const userTokens = new Set(tokenize(userCode));
  const solutionTokens = new Set(tokenize(solutionCode));

  const userConcepts = extractConcepts(userCode);
  const solutionConcepts = extractConcepts(solutionCode);

  // Token overlap
  const commonTokens = [...solutionTokens].filter(t => userTokens.has(t));
  const tokenOverlap = solutionTokens.size > 0 ? commonTokens.length / solutionTokens.size : 0;

  // Concept overlap
  const matchedConcepts = [...solutionConcepts].filter(c => userConcepts.has(c));
  const missedConcepts = [...solutionConcepts].filter(c => !userConcepts.has(c));
  const conceptOverlap = solutionConcepts.size > 0 ? matchedConcepts.length / solutionConcepts.size : 0;

  // Combined score
  const combined = tokenOverlap * 0.4 + conceptOverlap * 0.6;

  let score: number;
  if (combined >= 0.8) score = 5;
  else if (combined >= 0.6) score = 4;
  else if (combined >= 0.4) score = 3;
  else if (combined >= 0.2) score = 2;
  else score = 1;

  // User wrote almost nothing
  if (userCode.trim().length < 20) score = 1;

  let feedback: string;
  if (score >= 4) feedback = 'Świetna robota! Twoje rozwiązanie jest bardzo zbliżone do wzorcowego.';
  else if (score === 3) feedback = 'Dobry kierunek! Brakuje kilku kluczowych elementów.';
  else if (score === 2) feedback = 'Próba jest widoczna, ale sporo do poprawy. Sprawdź brakujące koncepcje.';
  else feedback = 'Spróbuj jeszcze raz — warto przeanalizować wzorcowe rozwiązanie.';

  // Format concepts for display
  const formatConcept = (c: string) => c.replace(/^(def|class|builtin|loop):/, '').replace(/_/g, ' ');

  return {
    score,
    feedback,
    matchedConcepts: matchedConcepts.map(formatConcept),
    missedConcepts: missedConcepts.map(formatConcept),
  };
}
