const PYODIDE_VERSION = '0.27.0';
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodide: any = null;
let initPromise: Promise<any> | null = null;
let runTestsFn: any = null;

const RUN_TESTS_CODE = `
import ast, json, sys, io

def _run_tests(user_code, test_code):
    namespace = {}
    old_stdout = sys.stdout
    captured = io.StringIO()
    sys.stdout = captured

    try:
        compiled = compile(user_code, '<user_code>', 'exec')
    except SyntaxError as e:
        sys.stdout = old_stdout
        return json.dumps({
            "syntaxError": f"Linia {e.lineno}: {e.msg}",
            "testResults": [],
            "output": captured.getvalue()
        })

    try:
        exec(compiled, namespace)
    except Exception as e:
        sys.stdout = old_stdout
        return json.dumps({
            "runtimeError": f"{type(e).__name__}: {e}",
            "testResults": [],
            "output": captured.getvalue()
        })

    # Defensive: legacy content sometimes wraps code in markdown fences
    test_code = '\\n'.join(l for l in test_code.split('\\n') if not l.strip().startswith('\`\`\`'))

    # Execute the test code statement-by-statement IN ORDER (AST-based),
    # so interleaved setup/assert sequences and multi-line asserts work.
    results = []
    try:
        tree = ast.parse(test_code)
    except SyntaxError as e:
        sys.stdout = old_stdout
        return json.dumps({
            "testResults": [{"test": "(kod testów)", "passed": False, "error": f"Błąd składni testów: linia {e.lineno}: {e.msg}"}],
            "output": captured.getvalue()
        })

    aborted = False
    for node in tree.body:
        try:
            src = ast.get_source_segment(test_code, node) or ast.unparse(node)
        except Exception:
            src = ast.unparse(node)
        src_short = ' '.join(src.split())
        if len(src_short) > 160:
            src_short = src_short[:157] + '...'
        is_assert = isinstance(node, ast.Assert)
        if aborted:
            if is_assert:
                results.append({"test": src_short, "passed": False, "error": "pominięty (wcześniejszy błąd w testach)"})
            continue
        try:
            stmt = compile(ast.Module(body=[node], type_ignores=[]), '<test>', 'exec')
            exec(stmt, namespace)
            if is_assert:
                results.append({"test": src_short, "passed": True})
        except AssertionError as e:
            results.append({"test": src_short, "passed": False, "error": (str(e) or None)})
        except Exception as e:
            results.append({"test": src_short, "passed": False, "error": f"{type(e).__name__}: {e}"})
            if not is_assert:
                # a broken setup statement invalidates everything after it
                aborted = True

    sys.stdout = old_stdout
    return json.dumps({
        "testResults": results,
        "output": captured.getvalue()
    })
`;

async function ensurePyodide() {
  if (pyodide) return pyodide;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const mod = await import(
      /* @vite-ignore */
      `${PYODIDE_CDN}pyodide.mjs`
    );
    pyodide = await mod.loadPyodide({ indexURL: PYODIDE_CDN });
    pyodide.runPython(RUN_TESTS_CODE);
    runTestsFn = pyodide.globals.get('_run_tests');
    return pyodide;
  })();

  return initPromise;
}

self.onmessage = async (event: MessageEvent) => {
  const { type, userCode, testCode, id } = event.data;

  if (type === 'init') {
    try {
      await ensurePyodide();
      self.postMessage({ type: 'ready', id });
    } catch (error: any) {
      self.postMessage({ type: 'error', id, error: error.message });
    }
    return;
  }

  if (type === 'run') {
    try {
      await ensurePyodide();
      const resultJson = runTestsFn(userCode, testCode);
      const result = JSON.parse(resultJson);
      self.postMessage({ type: 'result', id, ...result });
    } catch (error: any) {
      self.postMessage({ type: 'error', id, error: error.message });
    }
  }
};
