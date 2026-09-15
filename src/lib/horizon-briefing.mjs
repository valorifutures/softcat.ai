import { FUTURES, horizonSearch, readHorizonState } from './horizon-explorer.mjs';
import { clockHistory } from './horizon-clocks.mjs';

export const EDUCATION_PRAGMATIC_SCOPE = 'Partial change within existing institutions. This date window does not describe the full replacement threshold above.';

// Export the same verified data and exact date wording as the selected view.
// A portable briefing carries its evidence limits, not a ticking snapshot.
export function horizonBriefing(data, selection) {
  const state = readHorizonState(new URLSearchParams(selection).toString());
  const { id } = FUTURES.find(future => future.key === state.future);
  const scenario = data.scenarios.find(item => item.id === id);
  const record = data.review.futures.find(item => item.id === id);
  const brief = data.briefs.find(item => item.id === id);
  const branch = scenario[state.view];
  const reviewedAt = clockHistory(data.history, id, state.view).at(-1).date;
  const outlook = state.view.charAt(0).toUpperCase() + state.view.slice(1);
  const scope = state.future === 'education' && state.view === 'pragmatic' ? `Scope of this view: ${EDUCATION_PRAGMATIC_SCOPE}\n` : '';
  const sources = record.evidence.map((source, index) => [
    `${index + 1}. ${source.title} (${source.date_label})`,
    source.url,
    `Finding: ${source.finding}`,
    `The limit: ${source.limit}`,
  ].join('\n')).join('\n\n');

  return [
    `SOFT CAT .ai / Horizon briefing\n${record.title} · ${outlook} outlook`,
    `Illustrative editorial scenarios, not calibrated probabilities. The countdown follows a published calendar boundary. It does not predict an exact arrival date.`,
    `Sources reviewed: ${reviewedAt}\nOriginal date assumptions: ${data.review.dates_origin}`,
    `Scenario date wording: ${branch.timeframe}`,
    `Threshold: ${scenario.definition}\n${scope}`.trim(),
    `What this assumes\n${branch.assumptions}`,
    `What could change this view\n${branch.blockers}`,
    `What this means\n${branch.implication}`,
    `The CEO question\n${brief.question}`,
    `Use 10× as a design challenge. Measure the gain before claiming it.`,
    `Your next 90 days · ${outlook}\n${brief.moves[state.view]}`,
    `Know if it works\n${brief.measure}`,
    `What to watch\n${record.watch}`,
    `Our assessment\n${record.assessment}`,
    `Primary sources and their limits\n\n${sources}`,
    `Selected view\nhttps://softcat.ai/horizon/scenarios/${horizonSearch('', state)}`,
  ].join('\n\n');
}
