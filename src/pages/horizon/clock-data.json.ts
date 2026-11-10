import type { APIRoute } from 'astro';
import { horizonClockData } from '../../lib/horizon-clock-data';

export const GET: APIRoute = () => new Response(JSON.stringify(horizonClockData), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
