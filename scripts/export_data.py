#!/usr/bin/env python3
"""Export SQLite learning.db → JSON files for the PWA."""

import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'learning.db')
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'app', 'src', 'data')

def export():
    os.makedirs(OUT_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    cur = conn.cursor()

    # 1. Courses (hardcoded for now — single Python course)
    courses = [
        {
            "id": "python",
            "name": "Python",
            "icon": "🐍",
            "color": "#3B82F6",
            "description": "Podstawy programowania w Pythonie — zmienne, pętle, funkcje, pliki",
            "order": 1
        }
    ]
    write_json('courses.json', courses)

    # 2. Materials
    cur.execute('SELECT * FROM source_materials ORDER BY id')
    materials = []
    for r in cur.fetchall():
        topics = json.loads(r['topics']) if r['topics'] else []
        # Count related items
        cur2 = conn.cursor()
        cur2.execute('SELECT COUNT(*) FROM flashcards WHERE material_id=?', (r['id'],))
        fc_count = cur2.fetchone()[0]
        cur2.execute('SELECT COUNT(*) FROM quiz_questions WHERE material_id=?', (r['id'],))
        qz_count = cur2.fetchone()[0]
        cur2.execute('SELECT COUNT(*) FROM coding_exercises WHERE material_id=?', (r['id'],))
        ex_count = cur2.fetchone()[0]

        materials.append({
            "id": r['id'],
            "courseId": "python",
            "filename": r['filename'],
            "title": r['title'],
            "summary": r['summary'],
            "topics": topics,
            "flashcardCount": fc_count,
            "quizCount": qz_count,
            "exerciseCount": ex_count,
        })
    write_json('materials.json', materials)

    # 3. Flashcards
    cur.execute('SELECT * FROM flashcards ORDER BY id')
    flashcards = []
    for r in cur.fetchall():
        flashcards.append({
            "id": r['id'],
            "materialId": r['material_id'],
            "front": r['front'],
            "back": r['back'],
            "topic": r['topic'],
        })
    write_json('flashcards.json', flashcards)

    # 4. Quizzes
    cur.execute('SELECT * FROM quiz_questions ORDER BY id')
    quizzes = []
    for r in cur.fetchall():
        choices = json.loads(r['choices']) if r['choices'] else []
        quizzes.append({
            "id": r['id'],
            "materialId": r['material_id'],
            "question": r['question'],
            "choices": choices,
            "correctIndex": r['correct_index'],
            "explanation": r['explanation'],
            "difficulty": r['difficulty'],
            "topic": r['topic'],
        })
    write_json('quizzes.json', quizzes)

    # 5. Exercises
    cur.execute('SELECT * FROM coding_exercises ORDER BY id')
    exercises = []
    for r in cur.fetchall():
        exercises.append({
            "id": r['id'],
            "materialId": r['material_id'],
            "title": r['title'],
            "description": r['description'],
            "starterCode": r['starter_code'],
            "solution": r['solution'],
            "testCode": r['test_code'],
            "difficulty": r['difficulty'],
            "topic": r['topic'],
        })
    write_json('exercises.json', exercises)

    # 6. Explanations (empty — feature removed)
    write_json('explanations.json', [])

    conn.close()
    print(f"Exported to {OUT_DIR}:")
    for f in os.listdir(OUT_DIR):
        size = os.path.getsize(os.path.join(OUT_DIR, f))
        print(f"  {f}: {size/1024:.1f} KB")

def write_json(filename, data):
    path = os.path.join(OUT_DIR, filename)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    export()
