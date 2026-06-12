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


NOTES_SYSTEM_PROMPT = """You are an expert Python teacher writing a COMPLETE, self-contained mobile lesson.

The student reads ONLY this lesson — they have no other source. Nothing can be left implicit or "to be guessed".
Write in simple, everyday Polish. Short sentences. No fancy words. Explain like talking to a friend who just started coding.
Every code example MUST be followed by what it prints/returns, so the student never has to guess the result.

Use markdown formatting:
- ## for section headers
- ### for concept names
- `inline code` for code references
- ```python for code blocks
- **bold** for important terms
- - for bullet lists

ONLY use concepts from the provided material. Do NOT introduce anything new.
Respond with a JSON object: {"notes": "markdown string"} — no markdown wrapper, no text before/after."""


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
  "notes": "condensed markdown notes (see NOTES RULES below)",
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

CODE EMBEDDING RULES (CRITICAL — MUST FOLLOW):
- For types 1 (CODE OUTPUT), 2 (FIND THE BUG), and 3 (WHICH VERSION): the code MUST be directly in the "question" field
- Use TRIPLE backticks (```python ... ```) for any code that is 2+ lines
- Example: "Co wypisze ten kod?\n\n```python\nx = [1, 2, 3]\nprint(x[1])\n```"
- NEVER write "Co zwróci ten kod?" without the actual code in the question
- NEVER wrap multi-line code in single backticks — ALWAYS use ```python
- Single backticks ONLY for short inline references like `len()` or `x = 5`

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
- Hints: 3-4 PROGRESSIVE micro-hints per exercise, each targeting ONE small step, ordered from gentle nudge to nearly-concrete. They are revealed one at a time in the app.
  - hint 1: which concept/tool to reach for ("Przyda się pętla `for` po liniach tekstu")
  - hint 2: shape of the approach ("Zbieraj wyniki do listy i na końcu ją zwróć")
  - hint 3(-4): the trickiest detail ("Pamiętaj, że `split()` bez argumentu usuwa puste wpisy")
  - NEVER paste solution lines into a hint
- Solutions: add SUBGOAL LABELS — short comments naming what each block achieves
  (e.g. `# 1. Wczytaj dane`, `# 2. Policz wystąpienia`, `# 3. Zwróć wynik`).
  Research shows subgoal-labeled examples significantly help beginners.
- NEVER copy examples from the material — create new scenarios
- ONLY use concepts taught in the material — do NOT require knowledge of functions/syntax not in the lesson
- Descriptions and hints: plain language, no fancy words
- Remember: the student understands concepts but struggles to write code from scratch

========================================
NOTES RULES (full self-contained lesson, 600-1200 words)
========================================
This is the MAIN lesson the student reads BEFORE flashcards/quiz/coding. It must teach
the topic completely — the student has no transcript, no video, nothing else. Structure:

## O czym jest ta lekcja
2-3 sentences: what the student will be able to DO after this lesson and why it matters
in real programs. Optionally a simple real-life analogy.

## [Concept Name — one section per concept, 3-6 sections]
For EACH key concept from the material:
1. Plain-Polish explanation (2-4 short sentences). Use an everyday analogy when helpful.
2. A minimal code example:
```python
# code with short Polish comments
```
3. DIRECTLY under each code block, show the result — e.g. "Wynik: `42`" or
   "To wypisze: `cześć`" — the student must NEVER guess what code does.
4. If the concept has a gotcha, add "⚠️ Uwaga:" with one sentence.

## Krok po kroku: typowy przykład
One slightly bigger example combining the lesson's concepts, explained line by line
(numbered list: line — what it does). End with the full expected output.

## Ważne zasady
- **Rule** — explanation
(3-6 rules)

## Częste błędy
- **Mistake**: what the student typically writes, what error/wrong result appears
  (show the actual error message if relevant), and how to fix it
(2-4 mistakes)

## Szybka powtórka
3-5 one-line bullet points — the absolute essence to remember.

Rules:
- Write in simple Polish — short sentences, no jargon; explain any technical term in parentheses
- Use `backticks` for all code references, ```python blocks for code
- ALWAYS show outputs/results of examples — never leave the reader guessing
- Only cover concepts from the material — nothing extra
- Prefer concrete numbers/strings in examples over abstract foo/bar

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
            model="gpt-5.4-mini",
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
        try:
            data = parse_response(response_text)
        except ValueError as e:
            if attempt < max_retries:
                print(f"  Parse failed (attempt {attempt + 1}): {e}")
                time.sleep(2)
                continue
            else:
                raise

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
    # strict=False allows control characters (newlines/tabs) inside JSON strings
    try:
        return json.loads(response_text, strict=False)
    except json.JSONDecodeError:
        # Try to extract JSON from markdown code block
        match = re.search(r'```(?:json)?\s*(.*?)\s*```', response_text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1), strict=False)
            except json.JSONDecodeError:
                pass
        # Try to find JSON object
        match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0), strict=False)
            except json.JSONDecodeError:
                pass
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

    # Validate quiz code blocks — quizzes referencing code must include ```code blocks
    code_phrases = ['co zwróci ten kod', 'co wypisze ten kod', 'co wydrukuje ten kod',
                    'co zwróci poniższy kod', 'co wypisze poniższy kod']
    missing_code = sum(1 for q in quizzes
                       if any(p in q.get('question', '').lower() for p in code_phrases)
                       and '```' not in q.get('question', ''))
    if missing_code > 0:
        issues.append(f'{missing_code} quiz(es) reference code but lack code blocks')

    exercises = data.get('exercises', [])
    if len(exercises) < 3:
        issues.append(f'too few exercises ({len(exercises)})')

    if not data.get('notes') or len(data.get('notes', '')) < 100:
        issues.append('missing or too short notes')

    return issues


def extract_title(content: str, filename: str) -> str:
    """Extract title from first # heading or filename."""
    for line in content.split('\n'):
        line = line.strip()
        if line.startswith('# '):
            return line[2:].strip()
    # Fallback to filename
    return filename.replace('.md', '').replace('_', ' ').replace('-', ' ').title()


def generate_notes(filepath: str, title: str, api_key: str, max_retries: int = 2) -> str:
    """Generate only notes for an existing material (lightweight call)."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    client = OpenAI(api_key=api_key)

    prompt = f"""Generate condensed study notes for this Python lesson: "{title}"

MATERIAL:
{content}

Generate a JSON object with a single key "notes" containing a COMPLETE markdown lesson in Polish.
The lesson should be 600-1200 words, fully self-contained (the student reads only this),
and follow this structure:

## O czym jest ta lekcja
2-3 sentences: what the student will be able to DO and why it matters. Simple analogy welcome.

## [One section per key concept, 3-6 sections]
Plain explanation (2-4 sentences) + minimal ```python example + the printed/returned
result directly under it (e.g. "Wynik: `42`") + optional "⚠️ Uwaga:" gotcha.

## Krok po kroku: typowy przykład
A bigger example combining concepts, explained line by line, with full expected output.

## Kluczowe pojęcia
### Concept Name
2-3 sentences with `inline code`.
(3-6 concepts)

## Przykłady kodu
```python
# key example
```
(1-3 examples)

## Ważne zasady
- **Rule** — explanation
(3-6 rules)

## Częste błędy
- **Mistake**: explanation
(2-4 mistakes)

## Szybka powtórka
3-5 one-line bullets with the essence.

Write in simple Polish. Use `backticks` for code. Only concepts from the material.
ALWAYS show the output of every code example — the student must never guess.
Respond with JSON only: {{"notes": "markdown string"}}"""

    for attempt in range(max_retries + 1):
        response = client.chat.completions.create(
            model="gpt-5.4-mini",
            max_completion_tokens=8192,
            messages=[
                {"role": "system", "content": NOTES_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )

        response_text = response.choices[0].message.content
        if not response_text:
            if attempt < max_retries:
                print(f"  Empty response (attempt {attempt + 1}), retrying...")
                time.sleep(2)
                continue
            else:
                raise ValueError("API returned empty response after all retries")

        data = parse_response(response_text)
        notes = data.get('notes', '')

        if notes and len(notes) >= 100:
            return notes

        if attempt < max_retries:
            print(f"  Notes too short ({len(notes)} chars), retrying...")
            time.sleep(2)
        else:
            print(f"  WARNING: Notes still short after retries ({len(notes)} chars)")
            return notes

    return ''
