import { JSON_INPUT_LIMIT, JSON_VALIDATION_TIMEOUT } from './json-validation-limits.mjs';

export function startJsonValidation(schemaText, outputText, onResult, settings = {}) {
  if (schemaText.length > JSON_INPUT_LIMIT || outputText.length > JSON_INPUT_LIMIT) {
    onResult({ status: 'limit', message: 'Keep each editor below 1,000,000 characters. Split a larger document into smaller examples.', errors: [] });
    return () => {};
  }
  let active = true, worker, timer;
  const stop = () => { if (!active) return; active = false; clearTimeout(timer); worker?.terminate(); };
  const finish = result => { if (!active) return; stop(); onResult(result); };
  try {
    worker = settings.createWorker ? settings.createWorker() : new Worker(new URL('./json-validation.worker.mjs', import.meta.url), { type: 'module' });
    worker.onmessage = event => finish(event.data);
    worker.onerror = () => finish({ status: 'worker-error', message: 'The browser could not run the validator. Reload this page and try again.', errors: [] });
    timer = setTimeout(() => finish({ status: 'timeout', message: 'Validation exceeded 2.5 seconds and was stopped. Reduce the document or simplify complex patterns. No pass or fail was recorded.', errors: [] }), settings.timeoutMs ?? JSON_VALIDATION_TIMEOUT);
    worker.postMessage({ schemaText, outputText });
  } catch {
    finish({ status: 'worker-error', message: 'The browser could not start the validator. Reload this page and try again.', errors: [] });
  }
  return stop;
}
