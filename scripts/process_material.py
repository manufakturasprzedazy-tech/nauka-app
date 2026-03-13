#!/usr/bin/env python3
"""Process a single markdown material through OpenAI API to generate learning content."""

import json
import os
import re
import time

try:
    from openai import OpenAI
except ImportError:
    print("Required package: pip install openai")
    raise


SYSTEM_PROMPT = """You are an expert Python teacher creating learning materials for a mobile study app.

TARGET AUDIENCE: A Polish-speaking beginner learning Python from scratch. They know NOTHING beyond what is in the provided lesson.

LANGUAGE STYLE: Write in simple, everyday Polish. Short sentences. No fancy words, no academic tone,
no unnecessary jargon. Explain like talking to a friend who just started coding.

SCOPE CONSTRAINT: ONLY use concepts, functions, and syntax that appear in the provided material.
Do NOT introduce anything new — even if it seems basic or closely related.

FORMATTING RULES (CRITICAL):
- Inline code: wrap in backticks, e.g. `print()`, `len()`, `for x in list`
- Code blocks (2+ lines): triple backticks with language tag:
  ```python
  for i in range(5):
      print(i)
  ```
- Apply this consistently in EVERY field: front/back of flashcards, question/choices/explanation of quizzes, description of exercises
- Respond with VALID JSON only — no markdown wrapper, no text before/after

OUTPUT LANGUAGE: All content (flashcard text, quiz questions, exercise descriptions, explanations) must be in POLISH.
Code variable names may be in English."""


def build_prompt(content: str) -> str:
    """Build the user prompt for OpenAI API."""
    return f"""Analyze the following Python educational material and generate study content.

MATERIAL:
{content}

Generate JSON with this structure:
{{
  "title": "material title (in Polish)",
  "summary": "2-3 sentence summary in Polish",
  "topics": ["list", "of", "main", "topics"],
  "flashcards": [
    {{"front": "question", "back": "answer", "topic": "topic"}}
  ],
  "quizzes": [
    {{
      "question": "question",
      "choices": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "explanation",
      "difficulty": "easy|medium|hard",
      "topic": "topic"
    }}
  ],
  "exercises": [
    {{
      "title": "exercise title",
      "description": "task description",
      "hints": ["hint 1", "hint 2"],
      "starterCode": "# starter code\\n",
      "solution": "# full solution\\n",
      "testCode": "# tests\\nassert ...",
      "difficulty": "easy|medium|hard",
      "topic": "topic"
    }}
  ]
}}

========================================
TITLE RULES
========================================
- Sensible, descriptive topic title in Polish
- If material is a list of functions/methods — use a general topic title (e.g. "Operacje na słownikach")
- Do NOT copy the filename

========================================
FLASHCARD RULES (10-15 cards)
========================================
Generate a MIX of these types:
1. CONCEPT: "Co to jest X?" / "Co robi `function()`?"
2. COMPARISON: "Jaka jest różnica między `X` a `Y`?"
3. GOTCHA/PITFALL: "Co się stanie jeśli...?" / "Jaki częsty błąd popełniają początkujący z X?"
4. WHEN TO USE: "Kiedy lepiej użyć X zamiast Y?"

Rules:
- Test UNDERSTANDING of concepts, not memorization of lesson examples
- Answers: concise but complete
- If the answer involves code — include a short snippet in backticks
- ONLY test concepts from the material — do NOT introduce functions, methods, or syntax the student hasn't seen
- Use simple, short sentences — no academic language, no fancy wording
- Format code in backticks: `print()`, `len()`, ```python\\ncode\\n```

========================================
QUIZ RULES (8-12 questions, mixed difficulty)
========================================
Generate a MIX of these question types:
1. CODE OUTPUT: show a new snippet → "Co zwróci ten kod?" (4 choices with results)
2. FIND THE BUG: show code with a bug → "Co jest nie tak z tym kodem?"
3. WHICH VERSION: show 2-4 code variants → "Która wersja poprawnie robi X?"
4. WHAT HAPPENS: "Co się stanie gdy wywołamy `X` na pustej liście?"
5. CONCEPT: "Jaka jest różnica między X a Y?" / "Która metoda służy do X?"

CRITICAL RULES:
- NEVER copy examples from the material — create NEW variables, NEW values, NEW scenarios
- BAD: "Co zwróci friends[0] jeśli friends = ['Joseph', 'Glenn']?" (copied from lesson!)
- GOOD: "Co zwróci colors[2] jeśli colors = ['red', 'blue', 'green']?" (new data)
- Wrong answers must be plausible (common beginner mistakes, off-by-one, type errors)
- Explanation must cover: WHY the correct answer is correct + WHY the most popular wrong answer is wrong
- ONLY use concepts and syntax from the material — if the lesson covers `len()` and `range()`, do NOT use `enumerate()`, `.append()` etc.
- Explanations: simple language, 1-2 short sentences. No jargon. Like explaining to a friend.
- Format code in backticks

========================================
CODING EXERCISE RULES (4-6 exercises, easy to hard)
========================================
Rules:
- PRACTICAL tasks — the student writes code, NOT reproducing lesson examples
- Real-world context scenarios (data analysis, text processing, mini-tools)
- Difficulty levels:
  - easy: one function/concept, simple context
  - medium: combine 2-3 concepts, process data
  - hard: solve a real problem, handle edge cases
- Starter code: skeleton with TODO comments (def name(...): # TODO: ...)
- Solution: complete, readable solution with comments
- Test code: minimum 3 asserts, including edge cases (empty list, 0, empty string, etc.)
- Hints: 1-2 guiding hints per exercise — nudge toward solution, do NOT reveal it
  - GOOD: "Użyj pętli for do przejścia przez każdy element", "Sprawdź co zwraca `split()`"
  - BAD: "Użyj for i in range(len(lista)): wynik += lista[i]" (that's almost the solution!)
- NEVER copy examples from the material — create new scenarios
- ONLY use concepts taught in the material — do NOT require knowledge of functions/syntax not in the lesson
- Descriptions and hints: plain language, no fancy words
- Remember: the student understands concepts but struggles to write code from scratch

========================================
GENERAL
========================================
- If the material is a list of functions/methods — treat as one cohesive topic
- STRICTLY limit all content to concepts in the material — the student knows NOTHING beyond this lesson
- Write EVERYTHING in simple, everyday Polish — short sentences, no jargon, no academic tone
- ALL text content in POLISH (code variable names may be in English)
- Format CODE in backticks — this is critical for rendering in the app
- Respond with JSON ONLY"""


def process_material(filepath: str, api_key: str, max_retries: int = 2) -> dict:
    """Process a .md file and generate flashcards, quizzes, exercises."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    filename = os.path.basename(filepath)
    title = extract_title(content, filename)

    client = OpenAI(api_key=api_key)
    prompt = build_prompt(content)

    for attempt in range(max_retries + 1):
        response = client.chat.completions.create(
            model="gpt-5-mini",
            max_completion_tokens=16384,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )

        response_text = response.choices[0].message.content
        if not response_text:
            # Handle None/empty response (model refusal or filter)
            if attempt < max_retries:
                print(f"  Empty API response (attempt {attempt + 1}), retrying...")
                time.sleep(2)
                continue
            else:
                raise ValueError("API returned empty response after all retries")
        data = parse_response(response_text)

        # Validate completeness
        issues = validate_data(data)
        if not issues:
            break

        if attempt < max_retries:
            print(f"  Validation failed (attempt {attempt + 1}): {', '.join(issues)}")
            print(f"  Retrying...")
            time.sleep(2)
        else:
            print(f"  WARNING: After {max_retries + 1} attempts still missing: {', '.join(issues)}")

    data['filename'] = filename
    if not data.get('title'):
        data['title'] = title

    return data


def parse_response(response_text: str) -> dict:
    """Parse JSON from API response."""
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        # Try to extract JSON from markdown code block
        match = re.search(r'```(?:json)?\s*(.*?)\s*```', response_text, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        # Try to find JSON object
        match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise ValueError(f"Failed to parse API response:\n{response_text[:500]}")


def validate_data(data: dict) -> list[str]:
    """Validate that all required sections have content. Returns list of issues."""
    issues = []

    if not data.get('title'):
        issues.append('missing title')

    flashcards = data.get('flashcards', [])
    if len(flashcards) < 5:
        issues.append(f'too few flashcards ({len(flashcards)})')

    quizzes = data.get('quizzes', [])
    if len(quizzes) < 5:
        issues.append(f'too few quizzes ({len(quizzes)})')

    exercises = data.get('exercises', [])
    if len(exercises) < 3:
        issues.append(f'too few exercises ({len(exercises)})')

    return issues


def extract_title(content: str, filename: str) -> str:
    """Extract title from first # heading or filename."""
    for line in content.split('\n'):
        line = line.strip()
        if line.startswith('# '):
            return line[2:].strip()
    # Fallback to filename
    return filename.replace('.md', '').replace('_', ' ').replace('-', ' ').title()
