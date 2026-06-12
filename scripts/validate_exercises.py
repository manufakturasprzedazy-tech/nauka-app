# Quality gate: run EVERY exercise's model solution against its testCode,
# exactly like the app's Pyodide runner (setup lines + top-level asserts).
# Also reports exercises whose solution/test still contain markdown fences.

import io
import sqlite3
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
DB = r'C:\Users\DELL\OneDrive\Dokumenty\Kodowanko\Aplikacja do nauki\data\learning.db'
conn = sqlite3.connect(DB, timeout=30)


def strip_fences(code):
    lines = [l for l in (code or '').split('\n') if not l.strip().startswith('```')]
    return '\n'.join(lines)


import ast
import contextlib


def run_like_app(solution, test_code):
    # Mirrors the AST-based app runner: statements run IN ORDER; asserts are
    # recorded individually; a failed setup statement aborts the rest.
    ns = {'input': lambda prompt='': '5'}
    with contextlib.redirect_stdout(io.StringIO()):
        exec(solution, ns)

    tree = ast.parse(test_code)
    has_assert = any(isinstance(n, ast.Assert) for n in ast.walk(tree))
    if not has_assert:
        return 'NO_ASSERTS', 0

    failed = []
    passed = 0
    for node in tree.body:
        src = ' '.join((ast.get_source_segment(test_code, node) or ast.unparse(node)).split())[:120]
        is_assert = isinstance(node, ast.Assert)
        try:
            stmt = compile(ast.Module(body=[node], type_ignores=[]), '<test>', 'exec')
            with contextlib.redirect_stdout(io.StringIO()):
                exec(stmt, ns)
            if is_assert:
                passed += 1
        except Exception as e:
            failed.append(f'{src} -> {type(e).__name__}: {e}')
            if not is_assert:
                break
    return ('FAIL', failed) if failed else ('OK', passed)


rows = conn.execute('SELECT id, material_id, title, solution, test_code FROM coding_exercises ORDER BY id').fetchall()
ok = 0
fenced = []
problems = []

for ex_id, mat_id, title, solution, test_code in rows:
    has_fence = '```' in (solution or '') or '```' in (test_code or '')
    if has_fence:
        fenced.append(ex_id)
    sol = strip_fences(solution)
    tst = strip_fences(test_code)
    try:
        status, detail = run_like_app(sol, tst)
    except Exception as e:
        problems.append((ex_id, mat_id, title, f'SOLUTION CRASH: {type(e).__name__}: {e}'))
        continue
    if status == 'OK':
        ok += 1
    elif status == 'NO_ASSERTS':
        problems.append((ex_id, mat_id, title, 'brak assertow'))
    else:
        problems.append((ex_id, mat_id, title, '; '.join(detail[:2])))

print(f'OK: {ok}/{len(rows)}')
print(f'Z markdown fences: {len(fenced)} -> {fenced[:30]}')
print(f'PROBLEMY: {len(problems)}')
for ex_id, mat_id, title, msg in problems:
    print(f'  #{ex_id} (mat {mat_id}) {title}: {msg[:220]}')
