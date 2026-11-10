import { useState } from 'preact/hooks';
interface Prompt { id: string; title: string; description: string; category: string; tags: string[]; }
const groups = ['All recipes', 'Source work', 'Code work', 'Assistant design'];
const groupFor = (category: string) => ['data-extraction', 'summarisation', 'evaluation'].includes(category) ? 'Source work' : ['testing', 'code-review', 'debugging', 'refactoring', 'database', 'accessibility'].includes(category) ? 'Code work' : 'Assistant design';

export default function PromptFilter({ prompts }: { prompts: Prompt[] }) {
  const [group, setGroup] = useState(groups[0]);
  const [query, setQuery] = useState('');
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = prompts.filter(prompt => (group === groups[0] || groupFor(prompt.category) === group) && words.every(word => (prompt.title + ' ' + prompt.description + ' ' + prompt.tags.join(' ')).toLowerCase().includes(word)));
  return <div class="recipe-filter"><label>Find a recipe<input type="search" placeholder="Try extraction, regression or cost" value={query} onInput={event => setQuery(event.currentTarget.value)} /></label><div class="recipe-groups" role="group" aria-label="Recipe task">{groups.map(name => <button type="button" aria-pressed={group === name} onClick={() => setGroup(name)}>{name}</button>)}</div><p class="recipe-count" role="status">{filtered.length} {filtered.length === 1 ? 'recipe' : 'recipes'} shown</p><div class="recipe-cards">{filtered.map(prompt => <article><p>{groupFor(prompt.category)}</p><a href={'/prompts/' + prompt.id}><h2>{prompt.title}</h2><p>{prompt.description}</p><span>Template, example and checks ↗</span></a></article>)}</div>{filtered.length === 0 && <div class="recipe-no-results"><p>No recipes match those choices.</p><button type="button" onClick={() => { setQuery(''); setGroup(groups[0]); }}>Clear filters</button></div>}</div>;
}
