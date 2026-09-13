import { useState } from 'preact/hooks';
import { estimateTokens } from '../../utils/tokens';
import { estimateWorkload, workloadMoney } from '../../lib/model-workload.mjs';
import { contextLimit, outputLimit } from '../../lib/model-context.mjs';
import { parseCostTranscript, priceConversation, tokenCostReport, TOKEN_TEXT_LIMIT } from '../../lib/token-cost.mjs';
import './TokenCostCalculator.css';

type Model = { id: string; name: string; provider: string; inputPrice: number; outputPrice: number; pricingStatus: string; pricingCheckedAt: string; pricingSource: string; context: { status: string; catalogueTokens: number | null; providerTokens: number | null; outputTokens: number | null; checkedAt: string; source: string } };
const example = [
  { role: 'system', content: 'Answer in one sentence.' },
  { role: 'user', content: 'What is a token?' },
  { role: 'assistant', content: 'A token is a unit of text processed by a model, often a word or part of one.' },
  { role: 'user', content: 'Why does a longer conversation cost more?' },
  { role: 'assistant', content: 'Earlier messages are commonly sent again as input on each new call.' },
  { role: 'user', content: 'Give me one way to reduce repeated input.' },
];
const labels = (items: typeof example) => items.map(item => `${item.role[0].toUpperCase() + item.role.slice(1)}: ${item.content}`).join('\n');
const statusLabels: Record<string, string> = { 'above-saved-context': 'Estimated tokens exceed recorded context', 'above-output-limit': 'Estimated reply exceeds recorded output cap', 'unknown-context': 'Context limit unknown', 'unknown-price': 'Price unknown', 'invalid-workload': 'Cannot calculate this input' };
const fmt = (value: number) => value.toLocaleString('en-GB');
const date = (value: string) => new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';

export default function TokenCostCalculator({ models }: { models: Model[] }) {
  const [mode, setMode] = useState<'single' | 'conversation'>('single');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [transcript, setTranscript] = useState('');
  const [format, setFormat] = useState<'labels' | 'json'>('labels');
  const [selectedId, setSelectedId] = useState(models.find(model => model.id === 'anthropic/claude-sonnet-4')?.id ?? models[0]?.id ?? '');
  const [notice, setNotice] = useState('');
  const model = models.find(item => item.id === selectedId);
  if (!model) return <p>No verified rates are available. <a href="/lab/model-comparison">Inspect the model records</a>.</p>;
  const singleError = input.length > TOKEN_TEXT_LIMIT || output.length > TOKEN_TEXT_LIMIT ? `Keep each text field within ${fmt(TOKEN_TEXT_LIMIT)} characters. Your text has not been truncated.` : '';
  const singleReady = !!input.trim() && !singleError;
  const inputTokens = singleReady ? estimateTokens(input) : 0;
  const outputTokens = singleReady ? estimateTokens(output) : 0;
  const singlePrice = estimateWorkload(model, { ok: true, inputTokens, outputTokens, calls: 1 });
  const parsed = mode === 'conversation' ? parseCostTranscript(transcript, format, estimateTokens) : null;
  const conversationReady = !!parsed?.ok && parsed.messages.length > 0;
  const conversation = conversationReady ? priceConversation(model, parsed!.usage) : null;
  const ready = mode === 'single' ? singleReady : conversationReady;
  const resultCost = mode === 'single' ? singlePrice.cost : conversation?.cost;
  const partial = mode === 'single' ? output.length === 0 : conversation?.pending;
  const report = () => tokenCostReport(model, { mode, input, output, transcript, format }, estimateTokens);
  const copy = async () => {
    try { await navigator.clipboard.writeText(report()); setNotice('Copied the estimate, source and original text.'); }
    catch { setNotice('Copy was unavailable. Download the estimate to keep the same record.'); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([report()], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'softcat-token-cost.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice('Downloaded the estimate with its assumptions and source.');
  };
  const change = (callback: () => void) => { callback(); setNotice(''); };
  return <div class="token-calculator">
    <div class="tc-mode" role="group" aria-label="Estimate mode"><button type="button" aria-pressed={mode === 'single'} onClick={() => change(() => setMode('single'))}>Single request</button><button type="button" aria-pressed={mode === 'conversation'} onClick={() => change(() => setMode('conversation'))}>Conversation</button></div>
    <label class="tc-model">Model for cost estimate<select value={selectedId} onChange={event => change(() => setSelectedId(event.currentTarget.value))}>{models.map(item => <option value={item.id}>{item.name} · ${item.inputPrice}/M input · ${item.outputPrice}/M output</option>)}</select></label>
    <p class="tc-help tc-id">{model.id} · USD per million text tokens</p>
    {mode === 'single' ? <section aria-label="Single request text">
      <div class="tc-intro"><p class="eyebrow">PASTE THE TEXT YOU WANT TO PRICE</p><button type="button" onClick={() => change(() => { setInput('Summarise this note in one sentence:\nThe search box lost focus when it closed. We fixed focus restoration and checked the keyboard controls.'); setOutput('The search dialog now returns keyboard focus to its opener.'); })}>Try an illustrative pair</button></div>
      <div class="tc-editors"><label>Input text<textarea value={input} onInput={event => change(() => setInput(event.currentTarget.value))} placeholder="Include system instructions, the question and any history or documents sent with it." spellCheck={false} aria-describedby="tc-single-help" /></label><label>Expected output text <span>(optional)</span><textarea value={output} onInput={event => change(() => setOutput(event.currentTarget.value))} placeholder="Paste an example reply to include its estimated cost." spellCheck={false} aria-describedby="tc-single-help" /></label></div>
      <p class="tc-help" id="tc-single-help">Each field supports {fmt(TOKEN_TEXT_LIMIT)} characters. Leaving output empty gives an input-only estimate. This tool does not predict a reply or call a model.</p>
      {singleError && <p class="tc-error" role="alert">{singleError}</p>}
      {singleReady && <dl class="tc-counts"><div><dt>Estimated input tokens</dt><dd>{fmt(inputTokens)}</dd></div><div><dt>Estimated output tokens</dt><dd>{output.length ? fmt(outputTokens) : 'Not supplied'}</dd></div></dl>}
    </section> : <section aria-label="Conversation text">
      <div class="tc-intro"><p class="eyebrow">PRICE THE HISTORY EACH CALL SENDS AGAIN</p><button type="button" onClick={() => change(() => setTranscript(format === 'json' ? JSON.stringify(example, null, 2) : labels(example)))}>Try a growing conversation</button></div>
      <label class="tc-format">Transcript format<select value={format} onChange={event => change(() => setFormat(event.currentTarget.value as typeof format))}><option value="labels">Role-labelled text</option><option value="json">Message JSON</option></select></label>
      <label>Conversation transcript<textarea class="tc-transcript" value={transcript} onInput={event => change(() => setTranscript(event.currentTarget.value))} placeholder={format === 'labels' ? 'System: Optional instructions\nUser: A question\nAssistant: The reply\nUser: The next question' : '[{"role":"user","content":"A question"},{"role":"assistant","content":"The reply"}]'} spellCheck={false} aria-describedby="tc-transcript-help" aria-invalid={parsed && !parsed.ok} /></label>
      <p class="tc-help" id="tc-transcript-help">{format === 'labels' ? 'Start each message with System:, User: or Assistant: on its own line or before the text. Human: and AI: also work. Role labels inside fenced code remain content. Use message JSON for literal role labels outside code fences.' : 'Use an array of objects containing only role and content. Content must be a text string. This mode preserves literal role labels and code fences.'} Changing the format keeps your text. The example button loads a matching example. System instructions must come first. Each assistant reply needs a user message before it. Limit: 200 messages and {fmt(TOKEN_TEXT_LIMIT)} characters.</p>
      {parsed && !parsed.ok && <p class="tc-error" role="alert">{parsed.error} No cost has been calculated.</p>}
      {conversationReady && <>
        <details class="tc-parsed"><summary>Check the {parsed!.messages.length} parsed messages</summary><ol>{parsed!.messages.map(message => <li><p>{message.role} <span>about {fmt(message.tokens)} tokens</span></p><pre tabIndex={0} role="region" aria-label={`Message ${message.turnNumber} text`}>{message.text}</pre></li>)}</ol></details>
        <div class="tc-table-wrap" tabIndex={0} role="region" aria-label="Conversation costs by call"><table><caption>Each call includes all earlier system, user and assistant text. Token counts are estimates.</caption><thead><tr><th scope="col">Call</th><th scope="col">Input sent again</th><th scope="col">Reply tokens</th><th scope="col">Estimated USD</th></tr></thead><tbody>{conversation!.calls.map(call => <tr><th scope="row">{call.number}{call.pending && <span>planned</span>}</th><td>{fmt(call.inputTokens)}</td><td>{call.pending ? 'Not supplied' : fmt(call.outputTokens)}</td><td>{call.cost === null ? statusLabels[call.status] : workloadMoney(call.cost)}{call.pending && call.cost !== null && <span>input only</span>}</td></tr>)}</tbody></table></div>
        <dl class="tc-counts"><div><dt>Total estimated input, including repeats</dt><dd>{fmt(parsed!.usage.inputTokens)}</dd></div><div><dt>Total supplied output, estimated</dt><dd>{fmt(parsed!.usage.outputTokens)}</dd></div></dl>
      </>}
    </section>}
    {ready ? <section class="tc-result" aria-label="Estimate for supplied text"><p class="eyebrow">ESTIMATE FOR THE TEXT YOU SUPPLIED</p><div class="tc-price">{resultCost == null ? 'Unavailable' : workloadMoney(resultCost)}</div><p>{partial ? mode === 'single' ? 'Input only. No reply cost is included.' : 'Includes a planned call whose reply is not supplied. Its output cost is omitted.' : 'Includes the supplied input and output text.'}</p>{resultCost == null && <p>{mode === 'single' ? statusLabels[singlePrice.status] : 'At least one call exceeds a recorded limit or has unknown data, so a partial sum is not shown as the total.'}</p>}<p>Counts are approximate. A missing reply is unknown, not free.</p><div class="tc-actions"><button type="button" onClick={copy}>Copy estimate</button><button type="button" onClick={download}>Download estimate ↓</button></div><p class="tc-notice" role="status">{notice}</p></section> : <p class="tc-empty">{mode === 'single' ? 'Add input text to see an estimate.' : parsed?.ok ? 'Add a conversation or try the example.' : 'Fix the transcript above to calculate its cost.'}</p>}
    <aside class="tc-assumptions"><h2>Keep the estimate in perspective.</h2><p>The token count uses a character heuristic, not the selected model's tokenizer. Language, code, punctuation and encoding can change the real count. Message formatting overhead is excluded.</p><p>Conversation mode assumes all previous text is sent again on every call. It includes system instructions, but not cache discounts, hidden reasoning, tool charges, images or audio. Provider routing and other fees can change the bill.</p><p>Rates checked <time dateTime={model.pricingCheckedAt}>{date(model.pricingCheckedAt)}</time> against the <a href={model.pricingSource}>OpenRouter catalogue</a>. Planning context: {contextLimit(model) === null ? 'unknown' : fmt(contextLimit(model))} tokens. Output cap: {outputLimit(model) === null ? 'unknown' : fmt(outputLimit(model))} tokens. The <a href="/lab/context-window">Context Budget Planner</a> shows the separate limit review.</p><p>For counts from an actual tokenizer or provider usage record, use <a href="/lab/model-comparison">Model Comparison</a>. Pasted text stays in this page and is not saved.</p></aside>
  </div>;
}
