import { comparePrompts } from './prompt-diff.mjs';
self.onmessage = ({ data }) => {
  try { self.postMessage(comparePrompts(data.original, data.revised)); }
  catch { self.postMessage({ status: 'worker-error', message: 'The comparison could not complete. Try a smaller section.', changes: [] }); }
};
