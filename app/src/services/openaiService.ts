const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-5-mini';

const SYSTEM_PROMPT = `Jesteś cierpliwym nauczycielem Pythona. Wyjaśniasz pojęcia osobie, która DOPIERO zaczyna programować.

Zasady:
- Najpierw wyjaśnij PO LUDZKU w 2-3 prostych zdaniach — jakbyś tłumaczył 12-latkowi
- Potem KRÓTKI przykład kodu w \`\`\`python bloku (max 4 linie)
- Pod kodem 1 zdanie co ten kod zwróci/zrobi
- Unikaj żargonu — jeśli musisz użyć technicznego słowa, wyjaśnij je w nawiasie
- Formatuj: inline \`kod\`, bloki \`\`\`python`;

export async function explainContent(
  content: string,
  context: 'flashcard' | 'quiz',
  apiKey: string,
): Promise<string> {
  const userMessage =
    context === 'flashcard'
      ? `Nie rozumiem tego:\n\n${content}\n\nWytłumacz mi to prosto.`
      : `Nie rozumiem tego pytania:\n\n${content}\n\nWytłumacz mi o co tu chodzi.`;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_completion_tokens: 512,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
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
    throw new Error(`OpenAI API ${response.status}: ${detail}`);
  }

  const data = await response.json();
  const text = data.choices[0]?.message?.content;
  if (!text?.trim()) {
    throw new Error('API returned empty response');
  }
  return text;
}

export async function testOpenAIConnection(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_completion_tokens: 10,
        messages: [{ role: 'user', content: 'Odpowiedz: OK' }],
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
