import { createHash } from 'node:crypto';
import history from '../data/horizon/prediction-history.json';
import type { PredictionData } from './horizon-prediction-types';

const content = { schema: 1, history };
export const horizonPredictionData: PredictionData = { ...content, revision: createHash('sha256').update(JSON.stringify(content)).digest('hex') };
