import type { Ctx, Env } from './types';
import { HttpError, json, withCors } from './lib/http';
import { listStores } from './routes/stores';
import { getMenu, listCategories } from './routes/menu';
import { getCatering, getNutrition } from './routes/content';
import { login, me, signup } from './routes/auth';
import { listExchange, myRewards, redeem } from './routes/rewards';
import { createOrder, listOrders } from './routes/orders';

type Handler = (c: Ctx) => Promise<Response>;
const routes: Array<[method: string, pattern: string, handler: Handler]> = [
  ['GET', '/api/health', async () => json({ ok: true })],
  ['GET', '/api/stores', listStores],
  ['GET', '/api/categories', listCategories],
  ['GET', '/api/menu/:slug', getMenu],
  ['GET', '/api/catering', getCatering],
  ['GET', '/api/nutrition', getNutrition],
  ['GET', '/api/rewards/exchange', listExchange],
  ['POST', '/api/auth/signup', signup],
  ['POST', '/api/auth/login', login],
  ['GET', '/api/auth/me', me],
  ['GET', '/api/rewards/me', myRewards],
  ['POST', '/api/rewards/redeem', redeem],
  ['POST', '/api/orders', createOrder],
  ['GET', '/api/orders', listOrders],
];

function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split('/');
  const b = path.split('/');
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

async function handle(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  let pathMatched = false;
  for (const [method, pattern, handler] of routes) {
    const params = match(pattern, path);
    if (!params) continue;
    pathMatched = true;
    if (method === req.method) return handler({ req, env, url, params });
  }
  throw new HttpError(pathMatched ? 405 : 404, pathMatched ? 'Method not allowed' : 'Not found');
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }), env);
    try {
      return withCors(await handle(req, env), env);
    } catch (err) {
      if (err instanceof HttpError) return withCors(json({ error: err.message }, err.status), env);
      console.error(err);
      return withCors(json({ error: 'Something went wrong' }, 500), env);
    }
  },
} satisfies ExportedHandler<Env>;
