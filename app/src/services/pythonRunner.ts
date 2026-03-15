import type { TestResult } from '@/services/codeComparison';

export interface PythonRunResult {
  syntaxError?: string;
  runtimeError?: string;
  testResults: TestResult[];
  output: string;
  passRate: number;
}

let worker: Worker | null = null;
let messageId = 0;
let ready = false;
const pendingCallbacks = new Map<number, {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timer: number;
}>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL('../workers/pythonWorker.ts', import.meta.url),
      { type: 'module' }
    );
    worker.onmessage = handleMessage;
    worker.onerror = handleError;
  }
  return worker;
}

function handleMessage(event: MessageEvent) {
  const { type, id, ...data } = event.data;

  if (type === 'ready') {
    ready = true;
  }

  const pending = pendingCallbacks.get(id);
  if (pending) {
    clearTimeout(pending.timer);
    pendingCallbacks.delete(id);

    if (type === 'error') {
      pending.reject(new Error(data.error));
    } else {
      pending.resolve(data);
    }
  }
}

function handleError() {
  worker = null;
  ready = false;
  for (const [, pending] of pendingCallbacks) {
    clearTimeout(pending.timer);
    pending.reject(new Error('Worker crashed'));
  }
  pendingCallbacks.clear();
}

function sendMessage(msg: any, timeoutMs: number): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = ++messageId;
    const timer = window.setTimeout(() => {
      pendingCallbacks.delete(id);
      if (worker) {
        worker.terminate();
        worker = null;
        ready = false;
      }
      reject(new Error('Timeout: wykonanie kodu trwało za długo'));
    }, timeoutMs);

    pendingCallbacks.set(id, { resolve, reject, timer });
    getWorker().postMessage({ ...msg, id });
  });
}

export async function runPython(userCode: string, testCode: string): Promise<PythonRunResult> {
  const data = await sendMessage({ type: 'run', userCode, testCode }, 15000);

  const testResults: TestResult[] = data.testResults || [];
  const total = testResults.length;
  const passed = testResults.filter((t: TestResult) => t.passed).length;
  const passRate = total > 0 ? passed / total : 0;

  return {
    syntaxError: data.syntaxError,
    runtimeError: data.runtimeError,
    testResults,
    output: data.output || '',
    passRate,
  };
}

export function isLoaded(): boolean {
  return ready;
}

export function preload(): void {
  sendMessage({ type: 'init' }, 30000).catch(() => {});
}
