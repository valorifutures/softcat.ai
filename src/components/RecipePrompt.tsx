import { useState } from 'preact/hooks';

export default function RecipePrompt({ template, example, id }: { template: string; example: string; id: string }) {
  const [mode, setMode] = useState<'template' | 'example'>('template');
  const [notice, setNotice] = useState('');
  const text = mode === 'template' ? template : example;
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setNotice(`Copied the ${mode === 'template' ? 'template with input variables' : 'filled worked example'}.`); }
    catch { setNotice('Copy was unavailable. Select the prompt text below to copy it.'); }
  };
  return <div class="recipe-prompt">
    <div class="recipe-tabs" role="group" aria-label="Prompt version"><button type="button" aria-pressed={mode === 'template'} onClick={() => { setMode('template'); setNotice(''); }}>Reusable template</button><button type="button" aria-pressed={mode === 'example'} onClick={() => { setMode('example'); setNotice(''); }}>Worked example</button></div>
    <pre tabIndex={0} role="region" aria-label={mode === 'template' ? 'Reusable prompt template' : 'Filled example prompt'}>{text}</pre>
    <div class="recipe-prompt-actions"><button type="button" onClick={copy}>Copy {mode === 'template' ? 'template' : 'example'}</button><a href={`/lab/prompt-workbench?recipe=${encodeURIComponent(id)}`}>Edit the example in Workbench ↗</a></div>
    <p class="recipe-notice" role="status">{notice}</p><p class="recipe-small">Copying does not run the prompt. Workbench opens an editable draft with the example inputs. It does not save or send it.</p>
  </div>;
}
