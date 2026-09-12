// SSE events and UTF-8 characters can span arbitrary network chunks.
export async function readChatStream(body, onText = () => {}) {
  if (!body) throw new Error('The provider returned no response stream.');
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lines = [];
  let text = '';
  let usage = null;
  let completed = false;
  let doneMarker = false;

  function event() {
    if (!lines.length) return;
    const payload = lines.join('\n');
    lines = [];
    if (payload === '[DONE]') { doneMarker = true; completed = true; return; }
    let data;
    try { data = JSON.parse(payload); }
    catch { throw new Error('The provider sent an unreadable stream event. The response may be incomplete.'); }
    if (data.error) throw new Error(String(data.error.message || 'The provider reported a streaming error.').slice(0, 240));
    if (data.usage) usage = data.usage;
    const choice = data.choices?.[0];
    if (choice?.finish_reason) completed = true;
    const delta = choice?.delta?.content;
    if (typeof delta === 'string' && delta) { text += delta; onText(text); }
  }

  function line(value) {
    if (value.endsWith('\r')) value = value.slice(0, -1);
    if (!value) event();
    else if (value.startsWith('data:')) lines.push(value.slice(5).replace(/^ /, ''));
  }

  try {
    while (!doneMarker) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let newline;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        line(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        if (doneMarker) break;
      }
      if (done) {
        if (buffer) line(buffer);
        event();
        break;
      }
    }
    if (!completed) throw new Error('The connection ended before the response completed. Partial text is shown above.');
    if (!text) throw new Error('The provider completed without a text response. Try another model or adjust the prompt.');
    return { text, usage };
  } finally {
    try { await reader.cancel(); } catch {}
    reader.releaseLock();
  }
}
