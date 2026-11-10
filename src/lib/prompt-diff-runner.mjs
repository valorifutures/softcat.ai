import { DIFF_INPUT_LIMIT, DIFF_TIMEOUT } from './prompt-diff.mjs';

export function startPromptDiff(original, revised, onResult, settings = {}) {
  if (original.length > DIFF_INPUT_LIMIT || revised.length > DIFF_INPUT_LIMIT) {
    onResult({ status: 'limit', message: 'Keep each prompt within 200,000 characters. Compare a smaller section of a larger prompt.', changes: [] });
    return () => {};
  }
  let active = true, worker, timer;
  const stop = () => { if (!active) return; active = false; clearTimeout(timer); worker?.terminate(); };
  const finish = (result) => { if (!active) return; stop(); onResult(result); };
  try {
    worker = settings.createWorker ? settings.createWorker() : new Worker(new URL('./prompt-diff.worker.mjs', import.meta.url), { type: 'module' });
    worker.onmessage = (event) => finish(event.data);
    worker.onerror = () => finish({ status: 'worker-error', message: 'The browser could not run the comparison. Reload the page and try again.', changes: [] });
    timer = setTimeout(() => finish({ status: 'timeout', message: 'The comparison exceeded two seconds and was stopped. Try a smaller section. No word comparison was recorded.', changes: [] }), settings.timeoutMs ?? DIFF_TIMEOUT);
    worker.postMessage({ original, revised });
  } catch { finish({ status: 'worker-error', message: 'The browser could not start the comparison. Reload the page and try again.', changes: [] }); }
  return stop;
}
