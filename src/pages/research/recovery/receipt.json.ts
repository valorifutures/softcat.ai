import type { APIRoute } from 'astro';
import receipt from '../../../../research/recovery/results/latest.json';
export const GET: APIRoute = () => new Response(JSON.stringify(receipt, null, 2), {
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
});
