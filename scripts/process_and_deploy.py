#!/usr/bin/env python3
"""
All-in-one script: detect new materials → process with OpenAI API → save to SQLite → export JSON → deploy.

Usage:
  python scripts/process_and_deploy.py              # Process new materials + export JSON
  python scripts/process_and_deploy.py --deploy      # + git commit & push
  python scripts/process_and_deploy.py --dry-run     # Show what would be processed
  python scripts/process_and_deploy.py --reprocess   # Reprocess ALL existing materials
  python scripts/process_and_deploy.py --reprocess "Pętle definite" "Funkcje cz.1"  # Reprocess specific

Requirements:
  pip install openai
  Set OPENAI_API_KEY env variable or create .env file in project root.
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


def ensure_schema(conn):
    """Ensure database schema has all required columns."""
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(coding_exercises)")
    columns = [row[1] for row in cur.fetchall()]
    if 'hints' not in columns:
        cur.execute('ALTER TABLE coding_exercises ADD COLUMN hints TEXT DEFAULT "[]"')
        conn.commit()
        print("Dodano kolumnę 'hints' do tabeli coding_exercises.")

    cur.execute("PRAGMA table_info(source_materials)")
    columns = [row[1] for row in cur.fetchall()]
    if 'notes' not in columns:
        cur.execute('ALTER TABLE source_materials ADD COLUMN notes TEXT DEFAULT ""')
        conn.commit()
        print("Dodano kolumnę 'notes' do tabeli source_materials.")


def get_existing_filenames(conn):
    """Get set of filenames already in the database."""
    cur = conn.cursor()
    cur.execute('SELECT filename FROM source_materials')
    return {row[0] for row in cur.fetchall()}


def get_all_materials(conn):
    """Get all materials from the database."""
    cur = conn.cursor()
    cur.execute('SELECT id, filename, title FROM source_materials ORDER BY id')
    return cur.fetchall()


def get_new_materials(existing_filenames):
    """Find .md files not yet in the database."""
    if not os.path.exists(MATERIALS_DIR):
        return []

    all_md = [f for f in os.listdir(MATERIALS_DIR) if f.endswith('.md')]
    new_files = [f for f in all_md if f not in existing_filenames]
    return sorted(new_files)


def delete_material_data(conn, material_id):
    """Delete all data for a specific material (for reprocessing)."""
    cur = conn.cursor()
    cur.execute('DELETE FROM flashcards WHERE material_id = ?', (material_id,))
    cur.execute('DELETE FROM quiz_questions WHERE material_id = ?', (material_id,))
    cur.execute('DELETE FROM coding_exercises WHERE material_id = ?', (material_id,))
    cur.execute('DELETE FROM source_materials WHERE id = ?', (material_id,))
    conn.commit()


def save_to_db(conn, data):
    """Save processed material data to SQLite."""
    cur = conn.cursor()

    # Insert source_material
    cur.execute(
        '''INSERT INTO source_materials (filename, filepath, title, summary, topics, notes, processed_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))''',
        (data['filename'], data['filename'], data['title'], data['summary'],
         json.dumps(data.get('topics', []), ensure_ascii=False), data.get('notes', ''))
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
        hints = json.dumps(ex.get('hints', []), ensure_ascii=False)
        cur.execute(
            '''INSERT INTO coding_exercises (material_id, title, description, starter_code, solution, test_code, difficulty, topic, hints)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (material_id, ex['title'], ex['description'], ex.get('starterCode', ''),
             ex.get('solution', ''), ex.get('testCode', ''), ex.get('difficulty', 'medium'), ex.get('topic', ''), hints)
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
    subprocess.run(['git', 'commit', '-m', 'Przetworzono materiały z zaktualizowanymi promptami'], check=True)
    subprocess.run(['git', 'push'], check=True)
    print("Git push completed!")


def process_files(filenames, api_key, conn):
    """Process a list of .md files and save to database."""
    from process_material import process_material

    processed = 0
    for filename in filenames:
        filepath = os.path.join(MATERIALS_DIR, filename)
        if not os.path.exists(filepath):
            print(f"  POMINIĘTO: {filename} — plik nie istnieje w {MATERIALS_DIR}")
            continue

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

    return processed


def main():
    parser = argparse.ArgumentParser(description='Process materials and deploy')
    parser.add_argument('--deploy', action='store_true', help='Git commit and push after processing')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be processed')
    parser.add_argument('--reprocess', nargs='*', default=None,
                        help='Reprocess existing materials. Without args = ALL. With args = matching titles/filenames.')
    parser.add_argument('--generate-notes', action='store_true',
                        help='Generate notes for materials that don\'t have them yet.')
    args = parser.parse_args()

    load_env()

    api_key = os.environ.get('OPENAI_API_KEY', '')
    if not api_key and not args.dry_run:
        print("ERROR: OPENAI_API_KEY not set. Set it in .env or environment.")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH, timeout=30)
    ensure_schema(conn)

    # --- GENERATE NOTES MODE ---
    if args.generate_notes:
        from process_material import generate_notes

        cur = conn.cursor()
        cur.execute("SELECT id, filename, title FROM source_materials WHERE notes IS NULL OR notes = ''")
        missing = cur.fetchall()

        if not missing:
            print("Wszystkie materiały mają już notatki.")
            conn.close()
            if args.deploy:
                export_json()
                git_deploy()
            return

        print(f"Materiały bez notatek ({len(missing)}):")
        for mat_id, mat_filename, mat_title in missing:
            print(f"  [{mat_id}] {mat_title or mat_filename}")

        if args.dry_run:
            print("\n(--dry-run: nie generuję)")
            conn.close()
            return

        generated = 0
        for mat_id, mat_filename, mat_title in missing:
            filepath = os.path.join(MATERIALS_DIR, mat_filename)
            if not os.path.exists(filepath):
                print(f"  POMINIĘTO: {mat_filename} — plik nie istnieje")
                continue

            print(f"\nGeneruję notatki: {mat_title or mat_filename}...")
            try:
                notes = generate_notes(filepath, mat_title or mat_filename, api_key)
                cur.execute("UPDATE source_materials SET notes = ? WHERE id = ?", (notes, mat_id))
                conn.commit()
                print(f"  Zapisano ({len(notes)} znaków)")
                generated += 1
            except Exception as e:
                print(f"  BŁĄD: {e}")
                continue

        conn.close()
        print(f"\nWygenerowano notatki dla {generated}/{len(missing)} materiałów.")

        print("\nEksportuję JSON...")
        export_json()

        if args.deploy:
            print("\nDeploying...")
            git_deploy()

        print("\nGotowe!")
        return

    # --- REPROCESS MODE ---
    if args.reprocess is not None:
        all_materials = get_all_materials(conn)

        if len(args.reprocess) == 0:
            # Reprocess ALL
            to_reprocess = all_materials
        else:
            # Match by title or filename (partial match, case-insensitive)
            to_reprocess = []
            for mat_id, mat_filename, mat_title in all_materials:
                for query in args.reprocess:
                    q = query.lower()
                    if q in (mat_title or '').lower() or q in mat_filename.lower():
                        to_reprocess.append((mat_id, mat_filename, mat_title))
                        break

        if not to_reprocess:
            print("Nie znaleziono materiałów do przetworzenia.")
            conn.close()
            return

        print(f"Materiały do przetworzenia ponownie ({len(to_reprocess)}):")
        for mat_id, mat_filename, mat_title in to_reprocess:
            print(f"  [{mat_id}] {mat_title or mat_filename}")

        if args.dry_run:
            print("\n(--dry-run: nie przetwarzam)")
            conn.close()
            return

        # Delete existing data for these materials
        filenames_to_process = []
        for mat_id, mat_filename, mat_title in to_reprocess:
            print(f"  Usuwam stare dane: [{mat_id}] {mat_title or mat_filename}")
            delete_material_data(conn, mat_id)
            filenames_to_process.append(mat_filename)

        processed = process_files(filenames_to_process, api_key, conn)
        conn.close()
        print(f"\nPrzetworzono ponownie {processed}/{len(to_reprocess)} materiałów.")

        print("\nEksportuję JSON...")
        export_json()

        if args.deploy:
            print("\nDeploying...")
            git_deploy()

        print("\nGotowe!")
        return

    # --- NEW MATERIALS MODE (default) ---
    existing = get_existing_filenames(conn)
    new_files = get_new_materials(existing)

    if not new_files:
        print("Brak nowych materiałów do przetworzenia.")
        print(f"Istniejące: {len(existing)} materiałów w bazie.")

        if args.deploy:
            export_json()
            git_deploy()
        conn.close()
        return

    print(f"Znaleziono {len(new_files)} nowych materiałów:")
    for f in new_files:
        print(f"  - {f}")

    if args.dry_run:
        print("\n(--dry-run: nie przetwarzam)")
        conn.close()
        return

    processed = process_files(new_files, api_key, conn)
    conn.close()
    print(f"\nPrzetworzono {processed}/{len(new_files)} materiałów.")

    print("\nEksportuję JSON...")
    export_json()

    if args.deploy:
        print("\nDeploying...")
        git_deploy()

    print("\nGotowe!")


if __name__ == '__main__':
    main()
