import type { APIRoute } from 'astro';
import { horizonPredictionData } from '../../lib/horizon-prediction-data';

export const GET: APIRoute = () => new Response(JSON.stringify(horizonPredictionData), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
