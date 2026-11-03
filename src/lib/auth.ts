import type { Env } from '../types';
import { HttpError } from './http';

const enc = new TextEncoder();
const ITERATIONS = 100_000; // Workers' PBKDF2 limit
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 14;

const toB64 = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
const fromB64 = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toB64Url = (buf: ArrayBuffer | Uint8Array) => toB64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64Url = (s: string) => fromB64(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));

function safeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function pbkdf2(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { hash: toB64(await pbkdf2(password, salt)), salt: toB64(salt) };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  return safeEqual(await pbkdf2(password, fromB64(salt)), fromB64(hash));
}

async function hmacKey(secret: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  if (!secret) throw new Error('JWT_SECRET is not set. Run: npx wrangler secret put JWT_SECRET');
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

export async function signToken(userId: string, secret: string): Promise<string> {
  const header = toB64Url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const payload = toB64Url(enc.encode(JSON.stringify({ sub: userId, exp })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret, 'sign'), enc.encode(`${header}.${payload}`));
  return `${header}.${payload}.${toB64Url(sig)}`;
}

async function verifyToken(token: string, secret: string): Promise<string | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret, 'verify'), fromB64Url(parts[2]), enc.encode(`${parts[0]}.${parts[1]}`));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64Url(parts[1]))) as { sub: string; exp: number };
    return payload.exp > Date.now() / 1000 ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Returns the signed-in user id, or null when there is no valid token. */
export async function optionalUserId(req: Request, env: Env): Promise<string | null> {
  const h = req.headers.get('authorization') || '';
  return h.startsWith('Bearer ') ? verifyToken(h.slice(7), env.JWT_SECRET) : null;
}

export async function requireUserId(req: Request, env: Env): Promise<string> {
  const id = await optionalUserId(req, env);
  if (!id) throw new HttpError(401, 'Please sign in');
  return id;
}
