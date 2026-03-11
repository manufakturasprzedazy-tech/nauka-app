const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-5-mini';

const SYSTEM_PROMPT = `Jesteś nauczycielem Pythona. Tłumaczysz pojęcia jak kumplowi — prosto, bez żargonu.

Zasady:
- Max 3-4 zdania wyjaśnienia prostym językiem
- Użyj analogii do codziennego życia jeśli pasuje
- Podaj KRÓTKI przykład kodu w \`\`\`python bloku (max 5 linii)
- Nie powtarzaj treści karty/pytania
- Formatuj: inline \`kod\`, bloki \`\`\`python`;

export async function explainContent(
  content: string,
  context: 'flashcard' | 'quiz',
  apiKey: string,
): Promise<string> {
  const userMessage =
    context === 'flashcard'
      ? `Uczeń przeglądał fiszkę i nie rozumie pojęcia. Oto treść fiszki:\n\n${content}\n\nWyjaśnij kluczowe pojęcie z tej fiszki.`
      : `Uczeń odpowiadał na pytanie quizowe i nie rozumie pojęcia. Oto treść pytania:\n\n${content}\n\nWyjaśnij kluczowe pojęcie z tego pytania.`;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_completion_tokens: 1024,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
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
