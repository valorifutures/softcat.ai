import { useState, useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import { estimateTokens } from '../../utils/tokens';
import { WORKBENCH_KEY, HANDOFF_KEY, FIELD_LIMIT, LIBRARY_LIMIT, variableKeys, renderPrompt, promptMessages, requestBody, curlRequest, exportText, parsePromptLibrary, writePromptLibrary } from '../../lib/prompt-workbench.mjs';
import { workbenchPresets } from '../../lib/prompt-workbench-presets.mjs';
import { recipeDraft } from '../../lib/prompt-recipes.mjs';
import './PromptWorkbench.css';

interface PromptDraft { name: string; system: string; user: string; assistant: string; vars: Record<string, string>; model?: string; }
interface SavedPrompt extends PromptDraft { id?: string; timestamp: number; }
interface ModelInfo { id: string; name: string; provider: string; inputPrice: number; outputPrice: number; }
interface RecipeInfo { id: string; title: string; prompt: string; recipe: { exampleValues: Record<string, string> }; }
const blank = (): PromptDraft => ({ name: '', system: '', user: '', assistant: '', vars: {} });
const fingerprint = (p: PromptDraft) => JSON.stringify([p.name.trim(), p.system, p.user, p.assistant, Object.entries(p.vars).sort(([a], [b]) => a.localeCompare(b)), p.model || '']);

export default function PromptWorkbench({ models, recipes = [] }: { models: ModelInfo[]; recipes?: RecipeInfo[] }) {
  const [draft, setDraft] = useState<PromptDraft>(() => ({ ...blank(), model: models[0]?.id || '' }));
  const [baseline, setBaseline] = useState(() => fingerprint({ ...blank(), model: models[0]?.id || '' }));
  const [saved, setSaved] = useState<SavedPrompt[]>([]);
  const [libraryReady, setLibraryReady] = useState(false);
  const [libraryProblem, setLibraryProblem] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<'editor' | 'templates' | 'saved'>('editor');
  const [format, setFormat] = useState<'text' | 'json' | 'curl'>('text');
  const [pendingLoad, setPendingLoad] = useState<PromptDraft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const rawLibrary = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const selectedModel = models.find((model) => model.id === draft.model);
  const keys = variableKeys(draft.system, draft.user, draft.assistant);
  let rendered = { system: '', user: '', assistant: '', missing: [] as string[] };
  let renderError = '';
  try { rendered = renderPrompt(draft); } catch (error) { renderError = (error as Error).message; }
  let body: ReturnType<typeof requestBody> | null = null;
  let requestError = renderError;
  if (!requestError) {
    try {
      if (!selectedModel) throw new Error('Choose a model with a recorded price before exporting a request.');
      body = requestBody(rendered, selectedModel.id);
    } catch (error) { requestError = (error as Error).message; }
  }
  const preview = renderError ? '' : format === 'text' ? exportText(rendered) : body ? format === 'json' ? JSON.stringify(body, null, 2) : curlRequest(body) : '';
  const inputTokens = renderError ? 0 : promptMessages(rendered).reduce((sum: number, message: { content: string }) => sum + estimateTokens(message.content), 0);
  const inputCost = selectedModel ? inputTokens / 1_000_000 * selectedModel.inputPrice : null;
  const update = (change: Partial<PromptDraft>) => { setDraft((current) => ({ ...current, ...change })); setNotice(''); };

  const readLibrary = () => {
    setLibraryReady(false); setLibraryProblem(''); setPendingDelete(null);
    try {
      rawLibrary.current = localStorage.getItem(WORKBENCH_KEY);
      setSaved(parsePromptLibrary(rawLibrary.current)); setLibraryReady(true);
    } catch (error) {
      setLibraryProblem(`Saved data could not be opened. It has been left untouched. ${(error as Error).message}`);
    }
  };
  useEffect(readLibrary, []);

  const persist = (prompts: SavedPrompt[]) => {
    if (!libraryReady) throw new Error('Saved data is unavailable. Download your editor or saved data before reloading.');
    const raw = writePromptLibrary(localStorage, rawLibrary.current, prompts);
    rawLibrary.current = raw; setSaved(prompts);
  };
  const applyDraft = (next: PromptDraft) => {
    const value = { name: next.name, system: next.system, user: next.user, assistant: next.assistant, vars: { ...next.vars }, model: next.model ?? draft.model };
    setDraft(value); setBaseline(fingerprint(value)); setTab('editor'); setPendingLoad(null); setNotice('');
  };
  const loadDraft = (next: PromptDraft) => {
    if (fingerprint(draft) !== baseline) setPendingLoad(next);
    else applyDraft(next);
  };
  useLayoutEffect(() => {
    const id = new URLSearchParams(window.location.search).get('recipe');
    if (!id) return;
    const recipe = recipes.find(item => item.id === id);
    if (recipe) {
      applyDraft(recipeDraft(recipe));
      setNotice('Opened the recipe with its example inputs. It has not been saved or sent.');
    } else setNotice('That recipe is not in the current collection. Your saved library has not been changed.');
  }, []);
  const savePrompt = () => {
    if (!draft.name.trim()) { setNotice('Give this prompt a name before saving.'); return; }
    if (saved.some((prompt) => fingerprint(prompt) === fingerprint(draft))) { setNotice('This version is already saved in this browser.'); return; }
    try {
      persist([...saved, { ...draft, name: draft.name.trim(), id: crypto.randomUUID(), timestamp: Date.now() }]);
      setBaseline(fingerprint(draft)); setNotice('Saved a new version in this browser. Earlier versions have been kept.');
    } catch (error) { setNotice(`Could not save. Your editor is still here. ${(error as Error).message}`); }
  };
  const deletePrompt = (index: number) => {
    try { persist(saved.filter((_, i) => i !== index)); setPendingDelete(null); setNotice('Deleted that saved version.'); }
    catch (error) { setNotice(`Could not delete. ${(error as Error).message}`); }
  };
  const download = (text: string, filename: string, type = 'application/json') => {
    try {
      const url = URL.createObjectURL(new Blob([text], { type }));
      const link = document.createElement('a'); link.href = url; link.download = filename;
      document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Download prepared. Check your browser downloads.');
    } catch { setNotice('The download could not be prepared. You can select and copy the export preview.'); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(preview); setNotice('Copied the export.'); }
    catch { setNotice('Copy was unavailable. Select the export below, or download it.'); }
  };
  const importLibrary = async (file: File | undefined) => {
    if (!file) return;
    const expectedRaw = rawLibrary.current;
    try {
      if (file.size > LIBRARY_LIMIT) throw new Error('Keep a library file below 5 MB.');
      const imported = parsePromptLibrary(await file.text());
      if (rawLibrary.current !== expectedRaw) throw new Error('The saved library changed during import. Try importing the file again.');
      const merged = [...saved]; let added = 0;
      for (const prompt of imported) {
        if (merged.some((existing) => fingerprint(existing) === fingerprint(prompt) && existing.timestamp === prompt.timestamp)) continue;
        merged.push({ ...prompt, id: crypto.randomUUID() }); added++;
      }
      if (added) persist(merged);
      setNotice(`Imported ${added} saved ${added === 1 ? 'version' : 'versions'}. Existing prompts were kept.`);
    } catch (error) { setNotice(`Could not import. Existing prompts were kept. ${(error as Error).message}`); }
    finally { if (fileInput.current) fileInput.current.value = ''; }
  };
  const openPlayground = () => {
    if (!body || rendered.assistant) return;
    try {
      sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ version: 2, system: rendered.system, user: rendered.user, model: draft.model, createdAt: Date.now() }));
      window.location.assign('/lab/chat-playground?from=workbench');
    } catch { setNotice('This browser could not transfer the draft. Copy the text export and paste it into Chat Playground.'); }
  };

  return <div class="prompt-workbench">
    <div class="pw-toolbar"><div role="group" aria-label="Workbench views">{(['editor', 'templates', 'saved'] as const).map((view) => <button type="button" aria-pressed={tab === view} onClick={() => setTab(view)}>{view === 'editor' ? 'Editor' : view === 'templates' ? 'Examples' : `Saved (${saved.length})`}</button>)}</div><button type="button" onClick={() => loadDraft(blank())}>New prompt</button></div>
    {pendingLoad && <div class="pw-confirm" role="alert"><p>Your editor has unsaved edits. Replace them with the selected prompt?</p><button type="button" onClick={() => applyDraft(pendingLoad)}>Replace editor</button><button type="button" onClick={() => setPendingLoad(null)}>Keep editing</button></div>}
    {libraryProblem && <p class="pw-warning" role="alert">{libraryProblem} Use “Download saved data” in the Saved view to keep a copy.</p>}
    <p class="pw-notice" role="status">{notice}</p>

    {tab === 'templates' && <section aria-labelledby="pw-examples-heading"><h2 id="pw-examples-heading">Start with a question you can check.</h2><p class="pw-help">These are illustrative examples. Loading one makes no model call. Edit the inputs, then inspect the filled export.</p><div class="pw-examples">{workbenchPresets.map((preset) => <button type="button" onClick={() => loadDraft(preset)}><strong>{preset.name}</strong><span>{preset.description}</span><span class="pw-example-open">Use this example ↗</span></button>)}</div></section>}

    {tab === 'saved' && <section aria-labelledby="pw-saved-heading"><h2 id="pw-saved-heading">A library in this browser.</h2><p class="pw-help">Saving creates a version. It keeps earlier versions, even when the name is the same. Download a backup before clearing site data or moving devices.</p><div class="pw-library-actions"><button type="button" onClick={readLibrary}>Reload saved library</button><button type="button" disabled={!libraryReady && rawLibrary.current === null} onClick={() => download(libraryReady ? JSON.stringify({ version: 1, prompts: saved }, null, 2) : rawLibrary.current || '', 'softcat-prompt-library.json')}>Download saved data</button><label class="pw-import">Import library<input ref={fileInput} type="file" accept="application/json,.json" disabled={!libraryReady} onChange={event => importLibrary(event.currentTarget.files?.[0])} /></label></div>{libraryReady && saved.length === 0 && <p class="pw-empty">No saved prompts yet. Name a prompt in the editor and save its first version.</p>}<div class="pw-saved-list">{saved.map((prompt, index) => <article key={prompt.id || `${prompt.name}-${prompt.timestamp}-${index}`}><div><h3>{prompt.name}</h3><time dateTime={new Date(prompt.timestamp).toISOString()}>{new Date(prompt.timestamp).toLocaleString('en-GB')}</time></div><div class="pw-saved-actions"><button type="button" onClick={() => loadDraft(prompt)} aria-label={`Load ${prompt.name}`}>Load</button><button type="button" onClick={() => setPendingDelete(index)} aria-label={`Delete ${prompt.name}`}>Delete</button></div>{pendingDelete === index && <div class="pw-confirm"><p>Delete this saved version of “{prompt.name}”?</p><button type="button" onClick={() => deletePrompt(index)}>Delete this version</button><button type="button" onClick={() => setPendingDelete(null)}>Keep it</button></div>}</article>)}</div></section>}

    {tab === 'editor' && <>
      <div class="pw-editor-intro"><p class="pw-eyebrow">01 / WRITE THE MESSAGES</p><button type="button" onClick={() => setTab('templates')}>Try an example ↗</button></div>
      <div class="pw-editors">{([{ key: 'system', label: 'System prompt', placeholder: 'Instructions, boundaries and the output you need…' }, { key: 'user', label: 'User message', placeholder: 'The task and the material to work with…' }] as const).map((field) => <div><label for={`pw-${field.key}`}>{field.label}</label><textarea id={`pw-${field.key}`} value={draft[field.key]} maxLength={FIELD_LIMIT} onInput={event => update({ [field.key]: event.currentTarget.value })} placeholder={field.placeholder} spellCheck={false} /><p class="pw-help">Use {'{{variable}}'} to add a reusable input.</p></div>)}</div>
      <details class="pw-prefix" open={!!draft.assistant}><summary>Assistant prefix, for models that support it</summary><label for="pw-assistant">Assistant prefix (optional)</label><textarea id="pw-assistant" value={draft.assistant} maxLength={FIELD_LIMIT} onInput={event => update({ assistant: event.currentTarget.value })} spellCheck={false} /><p class="pw-help">This becomes a final assistant message in the export. Prefilling depends on the model and provider. Chat Playground does not import a prefix. Earlier saved prefixes are preserved here.</p></details>
      {!!keys.length && <section class="pw-variables" aria-labelledby="pw-variables-heading"><h2 id="pw-variables-heading">Fill the variables</h2><p class="pw-help">Empty values leave their markers in the text. Complete them before exporting a request.</p><div>{keys.map((key, index) => <div><label for={`pw-var-${index}`}>{`{{${key}}}`}</label><textarea id={`pw-var-${index}`} value={Object.hasOwn(draft.vars, key) ? draft.vars[key] : ''} maxLength={FIELD_LIMIT} rows={3} onInput={event => update({ vars: { ...draft.vars, [key]: event.currentTarget.value } })} spellCheck={false} /></div>)}</div></section>}
      <form class="pw-save" onSubmit={event => { event.preventDefault(); savePrompt(); }}><div><label for="pw-name">Prompt name</label><input id="pw-name" value={draft.name} maxLength={160} onInput={event => update({ name: event.currentTarget.value })} placeholder="Give this version a useful name" /></div><button type="submit" disabled={!libraryReady || !draft.name.trim()}>Save a version</button><p>Saved only when you choose. No account or cloud sync.</p></form>
      <section class="pw-export" aria-labelledby="pw-export-heading"><p class="pw-eyebrow">02 / INSPECT AND TAKE IT WITH YOU</p><h2 id="pw-export-heading">See exactly what you are copying.</h2><div class="pw-export-options"><div><label for="pw-model">OpenRouter model</label><select id="pw-model" value={draft.model} onChange={event => update({ model: event.currentTarget.value })}>{!selectedModel && <option value={draft.model || ''}>{draft.model ? `${draft.model} (not in the verified list)` : 'Choose a model'}</option>}{models.map((model) => <option value={model.id}>{model.name} ({model.provider})</option>)}</select></div><div><label for="pw-format">Export format</label><select id="pw-format" value={format} onChange={event => setFormat(event.currentTarget.value as typeof format)}><option value="text">Plain text</option><option value="json">OpenRouter request JSON</option><option value="curl">cURL for a POSIX shell</option></select></div></div>
        <p class="pw-estimate">{renderError ? 'The filled text is too large to estimate.' : <>About <strong>{inputTokens.toLocaleString('en-GB')} input tokens</strong>{inputCost !== null && <> · approximately <strong>${inputCost.toLocaleString('en-US', { maximumFractionDigits: 8 })}</strong> at the saved input rate</>}.</>}</p><p class="pw-help">This is a rough text estimate. It excludes message overhead, output, reasoning and caching. Tokenisation varies by model. Request exports set a 2,048-token output limit, which you can edit.</p>
        {(renderError || rendered.missing.length > 0) && <p class="pw-warning">{renderError || `Unfilled variables: ${rendered.missing.join(', ')}.`}</p>}
        {format !== 'text' && requestError && <p class="pw-warning">{requestError}</p>}
        {format === 'curl' && <p class="pw-help">Uses OpenRouter's chat endpoint. Set OPENROUTER_API_KEY in your shell before running it. Copying or downloading does not send a request. Running it may incur provider charges.</p>}
        <div class="pw-export-actions"><button type="button" class="pw-primary" disabled={!preview} onClick={copy}>Copy export</button><button type="button" disabled={!preview} onClick={() => download(preview, `softcat-prompt.${format === 'json' ? 'json' : format === 'curl' ? 'sh' : 'txt'}`, format === 'json' ? 'application/json' : 'text/plain')}>Download export</button><button type="button" disabled={!body || !!rendered.assistant} onClick={openPlayground}>Open draft in Chat Playground ↗</button></div>
        <p class="pw-help">The playground receives the filled system prompt, user draft and model choice in this tab. Nothing is sent until you choose Send. {rendered.assistant && 'Remove the assistant prefix to use this transfer.'}</p>
        <label class="pw-preview-label" for="pw-preview">Export preview</label><textarea id="pw-preview" class="pw-preview" readOnly value={preview} spellCheck={false} rows={12} placeholder="Your filled messages will appear here." />
      </section>
      <p class="pw-help pw-bottom-note">Each message and filled result is limited to 200,000 characters. Libraries hold up to 500 versions within 5 MB of JSON. Prompts and exports stay in your browser. Check model output with the <a href="/lab/json-validator">JSON validator</a> or compare prompt versions in <a href="/lab/prompt-diff">Prompt Diff</a>.</p>
    </>}
  </div>;
}
