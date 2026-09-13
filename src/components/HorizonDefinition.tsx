import { useEffect, useState } from 'preact/hooks';

const definitions = [
  { key: 'breadth', label: 'Breadth of ability', title: 'How general, and how capable?', text: 'Google DeepMind’s Levels of AGI framework treats breadth and depth of performance as distinct dimensions. Autonomy is a related deployment question.', test: 'We would look for broad, independently measured performance, with unfamiliar tasks and the comparison group specified.', limit: 'Calling something an early level of AGI is a different claim from demonstrating expert performance across most domains.', source: 'Read Levels of AGI', url: 'https://deepmind.google/research/publications/66938/' },
  { key: 'work', label: 'Economic work', title: 'Can it perform most valuable work?', text: 'OpenAI’s Charter connects AGI with highly autonomous systems that exceed human performance in most economically valuable work.', test: 'We would look for repeatable outcomes across a representative range of real work, including the assistance and costs involved.', limit: 'An impressive result in one profession, a selected task or a benchmark does not settle a claim about most valuable work.', source: 'Read the OpenAI Charter', url: 'https://openai.com/charter/' },
  { key: 'adaptation', label: 'Learning something new', title: 'Can it work out an unfamiliar problem?', text: 'ARC-AGI-3 tests exploration and adaptation in interactive environments. It offers a concrete way to examine part of the generalisation question.', test: 'We would look for repeatable adaptation with limited prior knowledge and a published account of the tools, attempts and resources used.', limit: 'This is a test of adaptive reasoning, rather than a complete definition or certificate of AGI.', source: 'Explore ARC-AGI-3', url: 'https://arcprize.org/arc-agi/3' },
];

export default function HorizonDefinition({ reviewedAt }: { reviewedAt: string }) {
  const [selected, setSelected] = useState('breadth');
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const reviewDate = new Date(`${reviewedAt}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return <section class="hz-agi" id="agi-question" aria-labelledby="agi-question-title">
    <div class="hz-agi-intro"><p class="hz-label">The question behind the timeline</p><h2 id="agi-question-title">Is AGI<br />already here<span>?</span></h2><p>Start with what you mean by general intelligence. The definition changes the evidence you need.</p><p class="hz-agi-note">Our reading of the sources, checked <time dateTime={reviewedAt}>{reviewDate}</time>. Explore the criteria before drawing a conclusion.</p></div>
    <div class="hz-agi-content">
      <div class="hz-definition-choices" role="group" aria-label="Explore an AGI definition">{definitions.map(item => <button type="button" disabled={!ready} aria-pressed={selected === item.key} aria-controls={`definition-${item.key}`} onClick={() => setSelected(item.key)}>{item.label}</button>)}</div>
      {definitions.map(item => <article class="hz-definition-panel" id={`definition-${item.key}`} hidden={selected !== item.key} key={item.key}>
        <h3>{item.title}</h3><p>{item.text}</p><h4>What would persuade us?</h4><p>{item.test}</p><p class="hz-definition-limit">{item.limit}</p><a href={item.url} target="_blank" rel="noopener noreferrer">{item.source} ↗</a>
      </article>)}
      <p class="sr-only" aria-live="polite">Showing {definitions.find(item => item.key === selected)!.label}.</p>
      <noscript><p>Also compare <a href="https://openai.com/charter/">OpenAI’s economic definition</a> and <a href="https://arcprize.org/arc-agi/3">ARC-AGI-3’s approach to adaptation</a>.</p></noscript>
    </div>
  </section>;
}
