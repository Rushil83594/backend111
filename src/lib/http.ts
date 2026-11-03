import type { Env } from '../types';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export function withCors(res: Response, env: Env): Response {
  const out = new Response(res.body, res);
  out.headers.set('access-control-allow-origin', env.ALLOWED_ORIGIN || '*');
  out.headers.set('access-control-allow-methods', 'GET,POST,OPTIONS');
  out.headers.set('access-control-allow-headers', 'content-type,authorization');
  out.headers.set('vary', 'origin');
  return out;
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON');
  }
}
