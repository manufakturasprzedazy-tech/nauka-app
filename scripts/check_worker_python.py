# Sanity check: extract RUN_TESTS_CODE from pythonWorker.ts, unescape the
# TS template-literal escapes, and compile + smoke-test it in real Python.

import io
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
path = r'C:\Users\DELL\OneDrive\Dokumenty\Kodowanko\Aplikacja do nauki\app\src\workers\pythonWorker.ts'
ts = open(path, encoding='utf-8').read()

m = re.search(r'const RUN_TESTS_CODE = `\n(.*?)`;', ts, re.S)
assert m, 'nie znaleziono RUN_TESTS_CODE'
code = m.group(1).replace('\\\\n', '\\n').replace('\\`', '`')

compile(code, '<worker>', 'exec')
ns = {}
exec(code, ns)
run = ns['_run_tests']

import json
# 1. interleaved setup/assert (the bug we fixed)
r = json.loads(run(
    'class C:\n    def __init__(self):\n        self.v = 0\n    def inc(self):\n        self.v += 1\n',
    'c = C()\nassert c.v == 0\nc.inc()\nassert c.v == 1\n',
))
assert all(t['passed'] for t in r['testResults']), r
assert len(r['testResults']) == 2

# 2. multi-line assert
r = json.loads(run('def f():\n    return [1, 2]\n', 'assert f() == [\n    1,\n    2,\n]\n'))
assert r['testResults'][0]['passed'], r

# 3. failing assert reported, later asserts still run
r = json.loads(run('x = 1\n', 'assert x == 2\nassert x == 1\n'))
assert r['testResults'][0]['passed'] is False
assert r['testResults'][1]['passed'] is True

# 4. markdown fences stripped defensively
r = json.loads(run('y = 5\n', '```python\nassert y == 5\n```\n'))
assert r['testResults'][0]['passed'], r

# 5. broken setup aborts following asserts
r = json.loads(run('z = 1\n', 'undefined_fn()\nassert z == 1\n'))
assert r['testResults'][0]['passed'] is False
assert 'pomini' in (r['testResults'][1].get('error') or '')

print('RUNNER OK — wszystkie 5 scenariuszy przechodzi')
