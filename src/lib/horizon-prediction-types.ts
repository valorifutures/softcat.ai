import type { Evidence } from './horizon-types';

export type PredictionRecord = {
  id: string;
  title: string;
  milestone: string;
  target_date: string;
  resolution: string[];
  rationale: string;
  uncertainty: string;
  earlier: string;
  later: string;
  evidence: Evidence[];
};
export type PredictionEvent = { id: string; date: string; reason: string; records: PredictionRecord[] };
export type PredictionData = { schema: number; revision: string; history: PredictionEvent[] };
export type CurrentPrediction = PredictionRecord & { reviewed_at: string; event_id: string; event_reason: string };
