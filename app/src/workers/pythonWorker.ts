const PYODIDE_VERSION = '0.27.0';
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodide: any = null;
let initPromise: Promise<any> | null = null;
let runTestsFn: any = null;

const RUN_TESTS_CODE = `
import json, sys, io

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

    lines = test_code.strip().split('\\n')
    setup_lines = []
    assert_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('assert '):
            assert_lines.append(stripped)
        elif stripped and not stripped.startswith('#'):
            setup_lines.append(line)

    if setup_lines:
        try:
            exec('\\n'.join(setup_lines), namespace)
        except Exception:
            pass

    results = []
    for assert_line in assert_lines:
        try:
            exec(assert_line, namespace)
            results.append({"test": assert_line, "passed": True})
        except AssertionError as e:
            error_msg = str(e) if str(e) else None
            results.append({"test": assert_line, "passed": False, "error": error_msg})
        except Exception as e:
            results.append({"test": assert_line, "passed": False, "error": f"{type(e).__name__}: {e}"})

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
