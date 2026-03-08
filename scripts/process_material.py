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
    """Process a .md file and generate flashcards, quizzes, exercises, and explanations."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    filename = os.path.basename(filepath)
    title = extract_title(content, filename)

    client = anthropic.Anthropic(api_key=api_key)

    # Generate all content in one call for efficiency
    prompt = f"""Przeanalizuj poniższy materiał edukacyjny i wygeneruj treści do nauki.

MATERIAŁ:
{content}

Wygeneruj JSON z następującą strukturą:
{{
  "title": "tytuł materiału",
  "summary": "krótkie podsumowanie (2-3 zdania)",
  "topics": ["lista", "głównych", "tematów"],
  "flashcards": [
    {{"front": "pytanie", "back": "odpowiedź", "topic": "temat"}}
  ],
  "quizzes": [
    {{
      "question": "pytanie",
      "choices": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "wyjaśnienie poprawnej odpowiedzi",
      "difficulty": "easy|medium|hard",
      "topic": "temat"
    }}
  ],
  "exercises": [
    {{
      "title": "tytuł ćwiczenia",
      "description": "opis zadania",
      "starterCode": "# kod startowy\\n",
      "solution": "# pełne rozwiązanie\\n",
      "testCode": "# kod testujący\\nassert ...",
      "difficulty": "easy|medium|hard",
      "topic": "temat"
    }}
  ]
}}

ZASADY:
- Fiszki: 8-12 sztuk, pytanie-odpowiedź, kluczowe pojęcia
- Quizy: 6-10 pytań, 4 odpowiedzi, różne trudności
- Ćwiczenia: 3-5 zadań kodowania, z kodem startowym i rozwiązaniem
- Wszystko po polsku
- Tematy (topics) powinny być zwięzłe (1-3 słowa)
- Odpowiedz TYLKO JSON, bez markdown"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
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
