// Each assistant section is one reply. Every call re-sends prior history.
// A trailing user section represents a planned call whose output is unknown.
export function conversationUsage(turns) {
  const calls = [];
  let history = 0;
  for (const turn of turns) {
    const tokens = Number.isFinite(turn.tokens) && turn.tokens > 0 ? turn.tokens : 0;
    if (turn.role === 'assistant') calls.push({ number: calls.length + 1, inputTokens: history, outputTokens: tokens, pending: false });
    history += tokens;
  }
  if (turns.at(-1)?.role === 'user') calls.push({ number: calls.length + 1, inputTokens: history, outputTokens: 0, pending: true });
  return {
    calls,
    inputTokens: calls.reduce((sum, call) => sum + call.inputTokens, 0),
    outputTokens: calls.reduce((sum, call) => sum + call.outputTokens, 0),
  };
}
