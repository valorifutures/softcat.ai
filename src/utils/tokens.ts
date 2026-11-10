// Approximate token estimator. For code-heavy text (>20% non-alpha chars),
// uses chars/3.2; otherwise chars/4.3. This is a rough heuristic — actual
// tokenisation varies by model and encoding.
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;
  const alphaCount = (text.match(/[a-zA-Z]/g) || []).length;
  const nonAlphaRatio = 1 - alphaCount / text.length;
  return Math.ceil(text.length / (nonAlphaRatio > 0.2 ? 3.2 : 4.3));
}
