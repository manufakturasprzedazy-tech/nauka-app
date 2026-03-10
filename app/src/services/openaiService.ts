const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-5-mini';

const SYSTEM_PROMPT = `Jesteś nauczycielem Pythona dla początkujących. Uczeń napotkał pojęcie lub funkcję, której jeszcze nie zna.

Zasady:
- Wyjaśnij KRÓTKO po polsku co to robi i do czego służy
- Podaj PRZYKŁAD KODU w \`\`\`python bloku pokazujący jak to działa
- Wyjaśnij DLACZEGO tak działa (mechanizm pod spodem)
- Skup się na nieznanym pojęciu, nie powtarzaj treści karty/pytania
- Formatuj kod inline jako \`kod\` i bloki jako \`\`\`python`;

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
  return data.choices[0].message.content;
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
