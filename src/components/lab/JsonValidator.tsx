import { useState, useRef, useEffect, useLayoutEffect } from 'preact/hooks';
import { startJsonValidation } from '../../lib/json-validation-runner.mjs';
import { JSON_INPUT_LIMIT } from '../../lib/json-validation-limits.mjs';
import { jsonValidationPresets, jsonValidationPresetIndex } from '../../lib/json-validation-presets.mjs';
import './JsonValidator.css';

interface ValidationResult {
  status: string;
  message: string;
  draft?: string;
  errors: { path: string; rule: string; message: string; schemaPath: string }[];
  totalErrors?: number;
  truncated?: boolean;
}
const pretty = (value: unknown) => JSON.stringify(value, null, 2);
const headings: Record<string, string> = {
  pass: 'Matches the schema', fail: 'Does not match the schema',
  'syntax-pass': 'JSON syntax is valid', 'json-error': 'The output needs a fix',
  'schema-error': 'The schema could not be checked', timeout: 'Validation was stopped',
  limit: 'This example is too large', 'worker-error': 'Validation could not run',
};

export default function JsonValidator() {
  const [preset, setPreset] = useState(0);
  const [schemaText, setSchemaText] = useState(pretty(jsonValidationPresets[0].schema));
  const [outputText, setOutputText] = useState(pretty(jsonValidationPresets[0].invalid));
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState('');
  const stopRef = useRef<(() => void) | null>(null);
  useEffect(() => () => stopRef.current?.(), []);

  const clearResult = () => { stopRef.current?.(); stopRef.current = null; setWorking(false); setResult(null); setNotice(''); };
  const editSchema = (text: string) => { clearResult(); setSchemaText(text); };
  const editOutput = (text: string) => { clearResult(); setOutputText(text); };
  const loadPreset = (index: number, valid = false) => {
    clearResult(); setPreset(index); setSchemaText(pretty(jsonValidationPresets[index].schema));
    setOutputText(pretty(valid ? jsonValidationPresets[index].valid : jsonValidationPresets[index].invalid));
  };
  useLayoutEffect(() => {
    // Apply a published example once. URL changes must not replace an edited draft.
    const id = new URLSearchParams(window.location.search).get('preset');
    if (id === null) return;
    const index = jsonValidationPresetIndex(id);
    if (index >= 0) loadPreset(index);
    else setNotice('That example is not available. The Classification example is open instead.');
  }, []);
  const validate = () => {
    clearResult(); setWorking(true);
    stopRef.current = startJsonValidation(schemaText, outputText, (next: ValidationResult) => { setResult(next); setWorking(false); });
  };
  const format = (kind: 'schema' | 'output') => {
    const text = kind === 'schema' ? schemaText : outputText;
    if (text.length > JSON_INPUT_LIMIT) { setNotice('Keep each editor below 1,000,000 characters before formatting.'); return; }
    try { const formatted = pretty(JSON.parse(text)); if (kind === 'schema') editSchema(formatted); else editOutput(formatted); }
    catch { setNotice(`The ${kind} must be valid JSON before it can be formatted.`); }
  };
  const copyReport = async () => {
    if (!result) return;
    const report = ['SOFT CAT JSON Output Validator', headings[result.status] ?? result.status, result.message,
      ...result.errors.map(error => `${error.path || '/ (root)'}: ${error.message} [${error.rule}]`),
      ...(result.truncated ? [`Showing ${result.errors.length} of ${result.totalErrors} errors.`] : []),
      'A schema result does not establish factual accuracy or permission to execute a tool.'].join('\n');
    try { await navigator.clipboard.writeText(report); setNotice('Copied the validation report.'); }
    catch { setNotice('Copy was unavailable. Select the report below to copy it.'); }
  };

  return <div class="json-validator">
    <section class="json-examples" aria-labelledby="json-examples-title">
      <div><p class="json-eyebrow">TRY A CONTRACT</p><h2 id="json-examples-title">Start with something that breaks.</h2><p>Each example includes an output with deliberate mistakes. Validate it, inspect the errors, then load the matching version.</p></div>
      <div class="json-preset-list">{jsonValidationPresets.map((item, index) => <button type="button" key={item.name} aria-pressed={preset === index} onClick={() => loadPreset(index)}>{item.name}</button>)}</div>
      <p class="json-preset-description">{jsonValidationPresets[preset].description}</p>
      {jsonValidationPresets[preset].source && <p><strong>Source for this worked example:</strong> {jsonValidationPresets[preset].source} <a href={`/prompts/${jsonValidationPresets[preset].recipeId}`}>Read the extraction recipe ↗</a></p>}
      <div class="json-example-actions"><button type="button" onClick={() => loadPreset(preset, false)}>Load broken example</button><button type="button" onClick={() => loadPreset(preset, true)}>Load matching example</button></div>
    </section>

    <div class="json-editors">
      <div class="json-editor"><div class="json-editor-heading"><label for="json-schema">JSON Schema <span>(optional)</span></label><button type="button" onClick={() => format('schema')}>Format schema</button></div><textarea id="json-schema" value={schemaText} onInput={event => editSchema(event.currentTarget.value)} spellCheck={false} autoCapitalize="off" autoComplete="off" aria-describedby="json-schema-help" /><p id="json-schema-help">Defaults to 2020-12. An explicit draft-07 declaration is also supported. Leave blank to check syntax only.</p></div>
      <div class="json-editor"><div class="json-editor-heading"><label for="json-output">JSON output</label><button type="button" onClick={() => format('output')}>Format output</button></div><textarea id="json-output" value={outputText} onInput={event => editOutput(event.currentTarget.value)} spellCheck={false} autoCapitalize="off" autoComplete="off" aria-describedby="json-output-help" /><p id="json-output-help">Paste the JSON itself, without Markdown fences. Editing either side clears the previous result.</p></div>
    </div>
    <div class="json-actions"><button type="button" class="json-validate" disabled={!outputText.trim() || working} onClick={validate}>{working ? 'Checking…' : 'Validate output'}<span aria-hidden="true">↗</span></button>{working && <button type="button" onClick={clearResult}>Stop</button>}<button type="button" onClick={() => { clearResult(); setSchemaText(''); setOutputText(''); }}>Clear editors</button><span>Runs here in your browser. Nothing is sent to an AI provider.</span></div>
    {working && <p role="status" class="json-working">Checking the schema and output…</p>}
    {result && <section class={`json-report json-report-${result.status}`} aria-labelledby="json-result-title">
      <div class="json-report-heading"><div role="status"><p class="json-eyebrow">VALIDATION RESULT</p><h2 id="json-result-title">{headings[result.status] ?? 'Validation result'}</h2><p>{result.message}</p></div><button type="button" onClick={copyReport}>Copy report</button></div>
      {!!result.errors.length && <><p class="json-error-count">{result.totalErrors} constraint {result.totalErrors === 1 ? 'failure' : 'failures'}. Paths use JSON Pointer notation.</p><ol class="json-error-list">{result.errors.map((error, index) => <li key={index}><code class="json-error-path">{error.path || '/ (root)'}</code><p>{error.message}</p><span>{error.rule}</span></li>)}</ol></>}
      {result.truncated && <p>Showing the first {result.errors.length} errors. Fix these and validate again to see what remains.</p>}
      {result.status === 'pass' && <p class="json-result-limit">The shape and permitted values match. Check the actual answer against your source material before relying on it.</p>}
    </section>}
    <p class="json-notice" role="status">{notice}</p>
    <details class="json-method"><summary>What this check covers</summary><div><p>Validation uses Ajv with JSON Schema draft-07 or 2020-12 and standard formats such as date, email and URI. It checks numeric bounds, extra properties, alternatives, array rules and local references. Unknown keywords, unknown formats, unresolved references and unsupported drafts produce a schema error.</p><p>External references are not fetched. Validation does not coerce types, remove fields or fill defaults. Each editor has a 1,000,000-character limit. A separate browser worker is stopped after 2.5 seconds if a complex schema or pattern takes too long.</p><p>A matching schema cannot establish facts, detect every harmful action or grant permission to execute a tool. A confidence between zero and one is only a number in range. It is not a calibrated probability.</p><p><a href="https://json-schema.org/draft/2020-12">JSON Schema 2020-12 ↗</a> · <a href="https://ajv.js.org/">Ajv documentation ↗</a> · <a href="https://github.com/valorifutures/softcat.ai/blob/main/src/lib/json-validation.mjs">Inspect the validator ↗</a></p></div></details>
  </div>;
}
