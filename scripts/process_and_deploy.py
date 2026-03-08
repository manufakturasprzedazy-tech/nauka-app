#!/usr/bin/env python3
"""
All-in-one script: detect new materials → process with Claude → save to SQLite → export JSON → deploy.

Usage:
  python scripts/process_and_deploy.py              # Process new materials + export JSON
  python scripts/process_and_deploy.py --deploy      # + git commit & push
  python scripts/process_and_deploy.py --dry-run     # Show what would be processed

Requirements:
  pip install anthropic
  Set ANTHROPIC_API_KEY env variable or create .env file in project root.
"""

import sqlite3
import json
import os
import sys
import argparse
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(ROOT_DIR, 'data', 'learning.db')
MATERIALS_DIR = os.path.join(ROOT_DIR, 'materials')
ENV_FILE = os.path.join(ROOT_DIR, '.env')


def load_env():
    """Load .env file if exists."""
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ.setdefault(key.strip(), value.strip())


def get_existing_filenames(conn):
    """Get set of filenames already in the database."""
    cur = conn.cursor()
    cur.execute('SELECT filename FROM source_materials')
    return {row[0] for row in cur.fetchall()}


def get_new_materials(existing_filenames):
    """Find .md files not yet in the database."""
    if not os.path.exists(MATERIALS_DIR):
        return []

    all_md = [f for f in os.listdir(MATERIALS_DIR) if f.endswith('.md')]
    new_files = [f for f in all_md if f not in existing_filenames]
    return sorted(new_files)


def save_to_db(conn, data):
    """Save processed material data to SQLite."""
    cur = conn.cursor()

    # Insert source_material
    cur.execute(
        '''INSERT INTO source_materials (filename, title, summary, topics, processed)
           VALUES (?, ?, ?, ?, 1)''',
        (data['filename'], data['title'], data['summary'], json.dumps(data.get('topics', []), ensure_ascii=False))
    )
    material_id = cur.lastrowid

    # Insert flashcards
    for fc in data.get('flashcards', []):
        cur.execute(
            'INSERT INTO flashcards (material_id, front, back, topic) VALUES (?, ?, ?, ?)',
            (material_id, fc['front'], fc['back'], fc.get('topic', ''))
        )

    # Insert quiz questions
    for q in data.get('quizzes', []):
        cur.execute(
            '''INSERT INTO quiz_questions (material_id, question, choices, correct_index, explanation, difficulty, topic)
               VALUES (?, ?, ?, ?, ?, ?, ?)''',
            (material_id, q['question'], json.dumps(q['choices'], ensure_ascii=False),
             q['correctIndex'], q.get('explanation', ''), q.get('difficulty', 'medium'), q.get('topic', ''))
        )

    # Insert coding exercises
    for ex in data.get('exercises', []):
        cur.execute(
            '''INSERT INTO coding_exercises (material_id, title, description, starter_code, solution, test_code, difficulty, topic)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
            (material_id, ex['title'], ex['description'], ex.get('starterCode', ''),
             ex.get('solution', ''), ex.get('testCode', ''), ex.get('difficulty', 'medium'), ex.get('topic', ''))
        )

    conn.commit()
    return material_id


def export_json():
    """Run the export script."""
    export_script = os.path.join(SCRIPT_DIR, 'export_data.py')
    subprocess.run([sys.executable, export_script], check=True)


def git_deploy():
    """Git add, commit, push."""
    os.chdir(ROOT_DIR)
    subprocess.run(['git', 'add', '-A'], check=True)
    subprocess.run(['git', 'commit', '-m', 'Dodaj nowe materiały i zaktualizuj dane'], check=True)
    subprocess.run(['git', 'push'], check=True)
    print("Git push completed!")


def main():
    parser = argparse.ArgumentParser(description='Process new materials and deploy')
    parser.add_argument('--deploy', action='store_true', help='Git commit and push after processing')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be processed')
    args = parser.parse_args()

    load_env()

    api_key = os.environ.get('ANTHROPIC_API_KEY', '')
    if not api_key and not args.dry_run:
        print("ERROR: ANTHROPIC_API_KEY not set. Set it in .env or environment.")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    existing = get_existing_filenames(conn)
    new_files = get_new_materials(existing)

    if not new_files:
        print("Brak nowych materiałów do przetworzenia.")
        print(f"Istniejące: {len(existing)} materiałów w bazie.")

        if args.deploy:
            export_json()
            git_deploy()
        return

    print(f"Znaleziono {len(new_files)} nowych materiałów:")
    for f in new_files:
        print(f"  - {f}")

    if args.dry_run:
        print("\n(--dry-run: nie przetwarzam)")
        conn.close()
        return

    # Import process_material
    from process_material import process_material

    processed = 0
    for filename in new_files:
        filepath = os.path.join(MATERIALS_DIR, filename)
        print(f"\nPrzetwarzam: {filename}...")

        try:
            data = process_material(filepath, api_key)
            material_id = save_to_db(conn, data)
            fc_count = len(data.get('flashcards', []))
            qz_count = len(data.get('quizzes', []))
            ex_count = len(data.get('exercises', []))
            print(f"  Zapisano: ID={material_id}, {fc_count} fiszek, {qz_count} quizów, {ex_count} ćwiczeń")
            processed += 1
        except Exception as e:
            print(f"  BŁĄD: {e}")
            continue

    conn.close()
    print(f"\nPrzetworzono {processed}/{len(new_files)} materiałów.")

    # Export JSON
    print("\nEksportuję JSON...")
    export_json()

    # Deploy
    if args.deploy:
        print("\nDeploying...")
        git_deploy()

    print("\nGotowe!")


if __name__ == '__main__':
    main()
