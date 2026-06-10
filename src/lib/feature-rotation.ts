// Featured-spotlight rotation (plan B5 / D14).
//
//   manifest ──▶ any tool with featured: true? ──▶ pin it (editorial override)
//        │                    no
//        ▼
//   ISO week number mod tool count ──▶ deterministic weekly pick, no state
//
// Pure function of (tools, date) so it is trivially testable and the
// spotlight changes Mondays via the daily bot-commit deploys.

export interface RotatableTool {
  id: string;
  featured?: boolean;
}

// ISO-8601 week number (Monday-based, week 1 contains the first Thursday).
export function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function pickFeatured<T extends RotatableTool>(tools: T[], now: Date): T | null {
  if (!tools.length) return null; // mod-0 guard: no spotlight over no tools
  const pinned = tools.find((t) => t.featured === true);
  if (pinned) return pinned;
  // year*53+week so the pick still advances across year boundaries
  const n = now.getUTCFullYear() * 53 + isoWeek(now);
  return tools[n % tools.length];
}
