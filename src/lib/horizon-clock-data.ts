import { createHash } from 'node:crypto';
import scenarios from '../data/horizon/scenarios.json';
import review from '../data/horizon/outlook-review.json';
import history from '../data/horizon/clock-history.json';
import briefs from '../data/horizon/decision-briefs.json';
import type { ClockData } from './horizon-types';

const content = { schema: 1, scenarios, review, history, briefs };
export const horizonClockData: ClockData = { ...content, revision: createHash('sha256').update(JSON.stringify(content)).digest('hex') };
