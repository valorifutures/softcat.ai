import { useState, useRef, useEffect } from 'preact/hooks';
import { estimateTokens } from '../../utils/tokens';
import { DIFF_INPUT_LIMIT, formatSignedUsd } from '../../lib/prompt-diff.mjs';
import { startPromptDiff } from '../../lib/prompt-diff-runner.mjs';
import { WORKBENCH_KEY, parsePromptLibrary, renderPrompt, exportText } from '../../lib/prompt-workbench.mjs';
import './PromptDiff.css';

interface ModelInfo { id: string; name: string; provider: string; inputPrice: number; pricingCheckedAt: string; pricingSource: string; }
interface SavedPrompt { name: string; system: string; user: string; assistant: string; vars: Record<string, string>; timestamp: number; }
interface Change { type: 'equal' | 'removed' | 'added'; value: string; }
interface DiffResult { status: string; message: string; changes: Change[]; }
const examples = [
  { name: 'Add a boundary', a: 'Answer the question using the supplied notes.', b: 'Answer the question using only the supplied notes. If the answer is absent, say what is missing.' },
  { name: 'Try a shorter brief', a: 'Please read the following incident report carefully. We would like you to provide a clear summary of the incident report in three bullet points.', b: 'Summarise the incident report in three bullet points.' },
  { name: 'Spot whitespace', a: 'Context:\n  The file is ready.\n\nQuestion: What changed?', b: 'Context: The file is ready.\nQuestion:  What changed?' },
];
const delta = (value: number) => `${value > 0 ? '+' : ''}${value.toLocaleString('en-GB')}`;
const spacing = (value: string) => value.replace(/ /g, '·').replace(/\t/g, '⇥').replace(/\r/g, '␍').replace(/\n/g, '↵\n');

export default function PromptDiff({ models }: { models: ModelInfo[] }) {
  const [original, setOriginal] = useState('');
  const [revised, setRevised] = useState('');
  const [modelId, setModelId] = useState(models[0]?.id || '');
  const [result, setResult] = useState<DiffResult | null>(null);
  const [working, setWorking] = useState(false);
  const [showSpacing, setShowSpacing] = useState(false);
  const [notice, setNotice] = useState('');
  const [saved, setSaved] = useState<SavedPrompt[]>([]);
  const [savedLoaded, setSavedLoaded] = useState(false);
  const [savedChoice, setSavedChoice] = useState('');
  const [savedMode, setSavedMode] = useState('filled');
  const stopRef = useRef<(() => void) | null>(null);
  useEffect(() => () => stopRef.current?.(), []);
  const model = models.find((item) => item.id === modelId);
  const tokensA = estimateTokens(original), tokensB = estimateTokens(revised);
  const charsA = Array.from(original).length, charsB = Array.from(revised).length;
  const costA = model ? tokensA / 1_000_000 * model.inputPrice : NaN;
  const costB = model ? tokensB / 1_000_000 * model.inputPrice : NaN;
  const clearResult = () => { stopRef.current?.(); stopRef.current = null; setWorking(false); setResult(null); setNotice(''); };
  const edit = (side: 'A' | 'B', value: string) => { clearResult(); if (side === 'A') setOriginal(value); else setRevised(value); };
  const compare = () => {
    clearResult(); setWorking(true);
    stopRef.current = startPromptDiff(original, revised, (next: DiffResult) => { setResult(next); setWorking(false); });
  };
  const loadExample = (example: typeof examples[number]) => { clearResult(); setOriginal(example.a); setRevised(example.b); };
  const loadLibrary = () => {
    try {
      const prompts = parsePromptLibrary(localStorage.getItem(WORKBENCH_KEY));
      setSaved(prompts); setSavedLoaded(true); setSavedChoice(prompts.length ? '0' : '');
      setNotice(prompts.length ? `Loaded ${prompts.length} saved versions from this browser.` : 'No saved prompts found. Save a version in Prompt Workbench first.');
    } catch (error) { setSaved([]); setSavedChoice(''); setSavedLoaded(false); setNotice(`The saved library could not be read. ${(error as Error).message}`); }
  };
  const useSaved = (side: 'A' | 'B') => {
    const prompt = saved[Number(savedChoice)];
    if (!prompt || !savedChoice) return;
    try {
      const filled = savedMode === 'filled' ? renderPrompt(prompt) : null;
      if (filled?.missing.length) throw new Error(`This version has unfilled variables: ${filled.missing.join(', ')}. Choose template text to compare its markers.`);
      const text = exportText(filled || prompt);
      if (text.length > DIFF_INPUT_LIMIT) throw new Error('The combined messages exceed 200,000 characters. Copy a smaller section from the Workbench.');
      edit(side, text); setNotice(`Loaded “${prompt.name}” into ${side}, using ${savedMode === 'filled' ? 'filled messages' : 'template text'}.`);
    } catch (error) { setNotice(`Could not load that version. The editor has been kept. ${(error as Error).message}`); }
  };
  const report = () => JSON.stringify({
    tool: 'SOFT CAT Prompt Diff', createdAt: new Date().toISOString(),
    comparison: result, original, revised,
    counts: { originalCharacters: charsA, revisedCharacters: charsB, characterUnit: 'Unicode code points', estimatedInputTokensA: tokensA, estimatedInputTokensB: tokensB },
    pricing: model ? { model: model.id, inputUsdPerMillion: model.inputPrice, checkedAt: model.pricingCheckedAt, source: model.pricingSource, estimatedInputUsdA: costA, estimatedInputUsdB: costB, estimatedInputUsdDelta: costB - costA } : null,
    limits: 'Text-token estimates only. No measured accuracy range. Message overhead, output, reasoning and caching are excluded. Length and price do not measure answer quality.',
  }, null, 2);
  const copyReport = async () => {
    try { await navigator.clipboard.writeText(report()); setNotice('Copied the comparison report, including both prompts and the price source.'); }
    catch { setNotice('Copy was unavailable. Use Download report or select the prompt text.'); }
  };
  const downloadReport = () => {
    try {
      const url = URL.createObjectURL(new Blob([report()], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'softcat-prompt-comparison.json'; document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Comparison download prepared. Check your browser downloads.');
    } catch { setNotice('The download could not be prepared. You can copy the report instead.'); }
  };
  const compared = result && ['complete', 'coarse', 'identical'].includes(result.status);
  const visibleChange = (change: Change, index: number) => {
    const text = showSpacing ? spacing(change.value) : change.value;
    return change.type === 'removed' ? <del key={index}>{text}</del> : change.type === 'added' ? <ins key={index}>{text}</ins> : <span key={index}>{text}</span>;
  };

  return <div class="prompt-diff">
    <section class="pd-examples" aria-labelledby="pd-examples-heading"><div><p class="pd-eyebrow">TRY A CHANGE</p><h2 id="pd-examples-heading">More precise? Shorter? Just different?</h2><p>Try a pair, inspect the changes, then test the output separately. A smaller prompt is not automatically a better prompt.</p></div><div>{examples.map((example) => <button type="button" onClick={() => loadExample(example)}>{example.name}</button>)}</div></section>
    <details class="pd-library"><summary>Compare saved Workbench versions</summary><p>Read saved prompts from this browser. Loading here does not change the saved library.</p><button type="button" onClick={loadLibrary}>{savedLoaded ? 'Refresh saved versions' : 'Read saved versions'}</button>{saved.length > 0 && <div class="pd-library-controls"><div><label for="pd-saved">Saved version</label><select id="pd-saved" value={savedChoice} onChange={event => setSavedChoice(event.currentTarget.value)}>{saved.map((prompt, index) => <option value={String(index)}>{prompt.name} · {new Date(prompt.timestamp).toLocaleString('en-GB')}</option>)}</select></div><div><label for="pd-saved-mode">Use</label><select id="pd-saved-mode" value={savedMode} onChange={event => setSavedMode(event.currentTarget.value)}><option value="filled">Filled messages</option><option value="template">Template text with markers</option></select></div><button type="button" onClick={() => useSaved('A')}>Load into A</button><button type="button" onClick={() => useSaved('B')}>Load into B</button></div>}</details>
    <div class="pd-editors">{([{ side: 'A', value: original, label: 'Prompt A, original' }, { side: 'B', value: revised, label: 'Prompt B, revised' }] as const).map((item) => <div><label for={`pd-${item.side}`}>{item.label}</label><textarea id={`pd-${item.side}`} value={item.value} maxLength={DIFF_INPUT_LIMIT} onInput={event => edit(item.side, event.currentTarget.value)} placeholder={item.side === 'A' ? 'Paste the original prompt…' : 'Paste the revised prompt…'} spellCheck={false} /><p>{Array.from(item.value).length.toLocaleString('en-GB')} characters</p></div>)}</div>
    <div class="pd-actions"><button type="button" class="pd-primary" disabled={working || (!original && !revised)} onClick={compare}>{working ? 'Comparing…' : 'Compare prompts'} <span aria-hidden="true">↗</span></button>{working && <button type="button" onClick={clearResult}>Stop comparison</button>}<button type="button" onClick={() => { clearResult(); setOriginal(revised); setRevised(original); }}>Swap A and B</button><button type="button" onClick={() => { clearResult(); setOriginal(''); setRevised(''); }}>Clear editors</button><span>Runs in this browser. No model call.</span></div>
    <section class="pd-measures" aria-labelledby="pd-measures-heading"><h2 id="pd-measures-heading">Put the size beside the price.</h2><div class="pd-model"><label for="pd-model">Model for the input estimate</label><select id="pd-model" value={modelId} onChange={event => setModelId(event.currentTarget.value)}>{models.map((item) => <option value={item.id}>{item.name} ({item.provider})</option>)}</select></div><div class="pd-table-wrap" role="region" tabIndex={0} aria-label="Prompt size and cost table, scroll horizontally for all columns"><table><caption>Rough input estimates. Delta is B minus A.</caption><thead><tr><th scope="col">Measure</th><th scope="col">A</th><th scope="col">B</th><th scope="col">Delta</th></tr></thead><tbody><tr><th scope="row">Characters</th><td>{charsA.toLocaleString('en-GB')}</td><td>{charsB.toLocaleString('en-GB')}</td><td>{delta(charsB - charsA)}</td></tr><tr><th scope="row">Estimated tokens</th><td>~{tokensA.toLocaleString('en-GB')}</td><td>~{tokensB.toLocaleString('en-GB')}</td><td>{delta(tokensB - tokensA)}</td></tr><tr><th scope="row">Input cost, USD</th><td>{formatSignedUsd(costA)}</td><td>{formatSignedUsd(costB)}</td><td>{formatSignedUsd(costB - costA, true)}</td></tr></tbody></table></div><p>Token counts use a text heuristic. There is no measured accuracy range. Estimates exclude message overhead, output, reasoning and caching. Price and length do not measure answer quality.</p></section>
    {working && <p class="pd-notice" role="status">Comparing the two prompts…</p>}
    {result && <section class="pd-result" aria-labelledby="pd-result-heading"><div class="pd-result-heading"><div role="status"><p class="pd-eyebrow">COMPARISON RESULT</p><h2 id="pd-result-heading">{result.status === 'identical' ? 'No changes.' : result.status === 'coarse' ? 'Changed blocks.' : result.status === 'complete' ? 'Here is what changed.' : 'The comparison stopped.'}</h2><p>{result.message}</p></div>{compared && <label class="pd-spacing"><input type="checkbox" checked={showSpacing} onChange={event => setShowSpacing(event.currentTarget.checked)} />Show spaces and line breaks</label>}</div>{compared && <><p class="pd-legend"><del>Removed from A</del><ins>Added in B</ins><span>Plain text is shared.</span></p><div class="pd-diff-panels">{(['A', 'B'] as const).map((side) => <div><h3>{side === 'A' ? 'A / ORIGINAL' : 'B / REVISED'}</h3><div class="pd-diff-text" role="region" tabIndex={0} aria-label={side === 'A' ? 'Original prompt with removals marked' : 'Revised prompt with additions marked'}>{result.changes.filter((change) => change.type !== (side === 'A' ? 'added' : 'removed')).map(visibleChange)}{!(side === 'A' ? original : revised) && <span class="pd-empty">Empty prompt</span>}</div></div>)}</div><div class="pd-report-actions"><button type="button" onClick={copyReport}>Copy report</button><button type="button" onClick={downloadReport}>Download report</button><span>Includes both prompts, the comparison and the price source.</span></div></>}</section>}
    <p class="pd-notice" role="status">{notice}</p>
    <details class="pd-method"><summary>How the comparison works</summary><p>Compare up to 200,000 characters per editor. Words are runs of non-whitespace text, and spaces, tabs and line breaks are preserved. Character totals count Unicode code points. A word comparison does not establish whether the meaning or the model's answer will stay the same.</p><p>A separate worker finds shared words and whitespace. Detailed comparison is limited to two million table cells and 600 display segments. Larger differences use explicitly labelled blocks. The worker is stopped after two seconds, and editing either prompt clears the previous result.</p><p><a href="/lab/prompt-workbench">Build and save a prompt in the Workbench ↗</a> · <a href="https://github.com/valorifutures/softcat.ai/blob/main/src/lib/prompt-diff.mjs">Inspect the comparison code ↗</a></p></details>
  </div>;
}
