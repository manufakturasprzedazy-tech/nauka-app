const API_URL = 'https://api.anthropic.com/v1/messages';

interface AIExplanationResult {
  score: number | null;
  feedback: string;
  strengths?: string[];
  improvements?: string[];
}

interface AICodeResult {
  score: number;
  feedback: string;
  isCorrect: boolean;
  strengths?: string[];
  improvements?: string[];
}

async function callClaude(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let detail = '';
    try {
      const err = JSON.parse(errorBody);
      detail = err.error?.message || errorBody;
    } catch {
      detail = errorBody;
    }
    throw new Error(`Claude API ${response.status}: ${detail}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

export async function evaluateExplanation(
  prompt: string,
  modelAnswer: string,
  userAnswer: string,
  apiKey: string,
): Promise<AIExplanationResult> {
  const systemPrompt = `Jesteś nauczycielem programowania. Oceniasz wyjaśnienia ucznia po polsku.
Odpowiedz TYLKO w formacie JSON:
{"score": <1-5>, "feedback": "<2-3 zdania po polsku>", "strengths": ["..."], "improvements": ["..."]}`;

  const userMessage = `Pytanie: ${prompt}

Odpowiedź wzorcowa: ${modelAnswer}

Odpowiedź ucznia: ${userAnswer}

Oceń odpowiedź ucznia w skali 1-5 i daj krótki feedback.`;

  const response = await callClaude(apiKey, systemPrompt, userMessage);
  try {
    const json = JSON.parse(response);
    return {
      score: json.score,
      feedback: json.feedback,
      strengths: json.strengths,
      improvements: json.improvements,
    };
  } catch {
    return { score: null, feedback: response };
  }
}

export async function evaluateCode(
  description: string,
  solution: string,
  userCode: string,
  testCode: string,
  apiKey: string,
): Promise<AICodeResult> {
  const systemPrompt = `Jesteś recenzentem kodu Python. Oceniasz kod ucznia po polsku.
Odpowiedz TYLKO w formacie JSON:
{"score": <1-5>, "isCorrect": <true/false>, "feedback": "<2-3 zdania po polsku>", "strengths": ["..."], "improvements": ["..."]}`;

  const userMessage = `Zadanie: ${description}

Rozwiązanie wzorcowe:
\`\`\`python
${solution}
\`\`\`

${testCode ? `Testy:\n\`\`\`python\n${testCode}\n\`\`\`\n` : ''}
Kod ucznia:
\`\`\`python
${userCode}
\`\`\`

Oceń kod ucznia w skali 1-5 i daj krótki feedback.`;

  const response = await callClaude(apiKey, systemPrompt, userMessage);
  try {
    const json = JSON.parse(response);
    return {
      score: Math.max(1, Math.min(5, json.score)),
      isCorrect: json.isCorrect ?? false,
      feedback: json.feedback,
      strengths: json.strengths,
      improvements: json.improvements,
    };
  } catch {
    return { score: 3, isCorrect: false, feedback: response, strengths: [], improvements: [] };
  }
}

export async function testConnection(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Odpowiedz: OK' }],
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
