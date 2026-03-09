#!/usr/bin/env python3
"""Process a single markdown material through Claude API to generate learning content."""

import json
import os
import re

try:
    import anthropic
except ImportError:
    print("Wymagany pakiet: pip install anthropic")
    raise


def process_material(filepath: str, api_key: str) -> dict:
    """Process a .md file and generate flashcards, quizzes, exercises."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    filename = os.path.basename(filepath)
    title = extract_title(content, filename)

    client = anthropic.Anthropic(api_key=api_key)

    prompt = f"""Przeanalizuj poniższy materiał edukacyjny o Pythonie i wygeneruj treści do nauki.

MATERIAŁ:
{content}

Wygeneruj JSON z następującą strukturą:
{{
  "title": "tytuł materiału (zdroworozsądkowy — jeśli materiał to lista funkcji, daj ogólny tytuł tematu np. 'Operacje na słownikach')",
  "summary": "podsumowanie 2-3 zdania — o czym jest materiał i co uczeń się nauczy",
  "topics": ["lista", "głównych", "tematów"],
  "flashcards": [
    {{"front": "pytanie", "back": "odpowiedź", "topic": "temat"}}
  ],
  "quizzes": [
    {{
      "question": "pytanie",
      "choices": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "wyjaśnienie DLACZEGO ta odpowiedź jest poprawna",
      "difficulty": "easy|medium|hard",
      "topic": "temat"
    }}
  ],
  "exercises": [
    {{
      "title": "tytuł ćwiczenia",
      "description": "opis zadania — co ma zrobić uczeń",
      "starterCode": "# kod startowy z komentarzami co zrobić\\n",
      "solution": "# pełne rozwiązanie\\n",
      "testCode": "# testy sprawdzające\\nassert ...",
      "difficulty": "easy|medium|hard",
      "topic": "temat"
    }}
  ]
}}

=== ZASADY DLA FISZEK ===
- 8-15 fiszek
- Testuj ZROZUMIENIE konceptów, nie pamięć konkretnych przykładów z lekcji
- Pytaj: "Co robi funkcja X?", "Jaka jest różnica między X a Y?", "Kiedy używamy X?"
- Odpowiedzi zwięzłe ale kompletne
- Możesz dodać fiszki z własnej wiedzy jeśli uzupełniają temat

=== ZASADY DLA QUIZÓW ===
- 8-12 pytań, mix trudności
- NIGDY nie pytaj o konkretne przykłady z materiału (np. "jaki był wynik friends[0]?")
- Pytaj o LOGIKĘ i ZROZUMIENIE:
  - "Co zwróci ten kod?" (z NOWYM przykładem, nie z materiału)
  - "Która metoda służy do X?"
  - "Co się stanie gdy zrobimy X z Y?"
  - "Jaka jest różnica między X a Y?"
- Błędne odpowiedzi powinny być wiarygodne (częste błędy początkujących)
- Wyjaśnienia tłumaczą DLACZEGO, nie tylko "bo tak"
- Kod w pytaniach: używaj NOWYCH zmiennych i wartości, nie tych z materiału

=== ZASADY DLA ĆWICZEŃ KODOWANIA ===
- 4-6 ćwiczeń, od łatwych do trudnych
- PRAKTYCZNE zadania — uczeń ma NAPISAĆ kod, nie odtworzyć przykład z lekcji
- Zadania typu:
  - easy: użyj jednej funkcji/konceptu w prostym kontekście
  - medium: połącz 2-3 koncepty razem, przetwórz dane
  - hard: rozwiąż realny problem używając konceptów z lekcji
- Starter code: szkielet z komentarzami co zrobić (def nazwa_funkcji(...): # ...)
- Solution: kompletne, czytelne rozwiązanie
- Test code: 2-3 asserty sprawdzające różne przypadki
- NIGDY nie kopiuj przykładów z materiału — twórz nowe scenariusze
- Pamiętaj: uczeń rozumie koncepty ale ma problem z pisaniem kodu — ćwiczenia mają budować tę umiejętność stopniowo

=== OGÓLNE ===
- Jeśli materiał to lista funkcji/metod — potraktuj jako jeden spójny temat
- Możesz dodawać treści z własnej wiedzy jeśli uzupełniają materiał
- Wszystko po polsku (nazwy zmiennych mogą być po angielsku)
- Odpowiedz TYLKO JSON, bez markdown"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=8192,
        messages=[{"role": "user", "content": prompt}],
    )

    response_text = message.content[0].text

    # Try to parse JSON from response
    try:
        data = json.loads(response_text)
    except json.JSONDecodeError:
        # Try to extract JSON from markdown code block
        match = re.search(r'```(?:json)?\s*(.*?)\s*```', response_text, re.DOTALL)
        if match:
            data = json.loads(match.group(1))
        else:
            raise ValueError(f"Nie udało się sparsować odpowiedzi Claude:\n{response_text[:500]}")

    data['filename'] = filename
    if not data.get('title'):
        data['title'] = title

    return data


def extract_title(content: str, filename: str) -> str:
    """Extract title from first # heading or filename."""
    for line in content.split('\n'):
        line = line.strip()
        if line.startswith('# '):
            return line[2:].strip()
    # Fallback to filename
    return filename.replace('.md', '').replace('_', ' ').replace('-', ' ').title()
