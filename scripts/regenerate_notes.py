#!/usr/bin/env python3
"""
Regenerate lesson notes ONLY for all materials using the improved lesson prompt.
Flashcards/quizzes/exercises and their IDs stay untouched — user progress is safe.

Usage:
  python scripts/regenerate_notes.py            # all materials
  python scripts/regenerate_notes.py 3 7        # only material ids 3 and 7
"""

import io
import os
import sys
import sqlite3

# Windows console uses cp1250 — force UTF-8 so titles with special chars don't crash prints
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(ROOT_DIR, 'data', 'learning.db')
MATERIALS_DIR = os.path.join(ROOT_DIR, 'materials')

sys.path.insert(0, SCRIPT_DIR)
from process_material import generate_notes  # noqa: E402
from process_and_deploy import load_env  # noqa: E402


def main():
    load_env()
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print('BLAD: brak OPENAI_API_KEY (.env lub zmienna srodowiskowa)')
        sys.exit(1)

    only_ids = {int(a) for a in sys.argv[1:]} if len(sys.argv) > 1 else None

    conn = sqlite3.connect(DB_PATH, timeout=30)
    cur = conn.cursor()
    cur.execute('SELECT id, filename, title FROM source_materials ORDER BY id')
    materials = cur.fetchall()

    ok, failed = 0, []
    for mat_id, filename, title in materials:
        if only_ids and mat_id not in only_ids:
            continue
        filepath = os.path.join(MATERIALS_DIR, filename)
        if not os.path.exists(filepath):
            print(f'[{mat_id}] POMIJAM — brak pliku {filename}')
            failed.append((mat_id, title, 'brak pliku .md'))
            continue

        print(f'[{mat_id}] Generuje lekcje: {title}...', flush=True)
        try:
            notes = generate_notes(filepath, title, api_key)
            if notes and len(notes) >= 300:
                cur.execute('UPDATE source_materials SET notes = ? WHERE id = ?', (notes, mat_id))
                conn.commit()
                print(f'[{mat_id}] OK ({len(notes)} znakow)', flush=True)
                ok += 1
            else:
                print(f'[{mat_id}] ZA KROTKIE ({len(notes)} znakow) — zostawiam stare', flush=True)
                failed.append((mat_id, title, f'za krotkie: {len(notes)}'))
        except Exception as e:
            print(f'[{mat_id}] BLAD: {e}', flush=True)
            failed.append((mat_id, title, str(e)))

    conn.close()

    print(f'\nGotowe: {ok} zaktualizowanych, {len(failed)} nieudanych')
    for mat_id, title, reason in failed:
        print(f'  - [{mat_id}] {title}: {reason}')


if __name__ == '__main__':
    main()
