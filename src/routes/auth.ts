import type { Ctx } from '../types';
import { HttpError, json, readJson } from '../lib/http';
import { hashPassword, requireUserId, signToken, verifyPassword } from '../lib/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const WELCOME_REWARD = 'Free chips & guac';

interface UserRow { id: string; email: string; name: string; password_hash: string; password_salt: string; points: number }

const NAME_RE = /^\p{L}+(?:[ '-]\p{L}+)*$/u;

/** Returns what is wrong with a password, or null when it is acceptable. */
function passwordProblem(pw: string): string | null {
  if (pw.length > 128) return 'Password is too long';
  if (/\s/.test(pw)) return 'Password cannot contain spaces';
  const need = [
    pw.length < 8 && 'at least 8 characters',
    !/[a-z]/.test(pw) && 'a lowercase letter',
    !/[A-Z]/.test(pw) && 'an uppercase letter',
    !/\d/.test(pw) && 'a number',
    !/[^A-Za-z0-9\s]/.test(pw) && 'a special character',
  ].filter(Boolean);
  return need.length ? `Password needs ${need.join(', ')}` : null;
}

// POST /api/auth/signup  { email, password, name }
export async function signup({ req, env }: Ctx): Promise<Response> {
  const b = await readJson<{ email?: string; password?: string; name?: string }>(req);
  const email = (b.email || '').trim().toLowerCase();
  const name = (b.name || '').trim();
  const password = b.password || '';
  if (!EMAIL_RE.test(email) || email.length > 254) throw new HttpError(400, 'Enter a valid email address');
  if (name.length < 2 || name.length > 50 || !NAME_RE.test(name)) {
    throw new HttpError(400, 'Use letters only in your name, with a single space, hyphen or apostrophe between words');
  }
  const problem = passwordProblem(password);
  if (problem) throw new HttpError(400, problem);

  const exists = await env.DB.prepare('SELECT 1 AS x FROM users WHERE email = ?').bind(email).first();
  if (exists) throw new HttpError(409, 'An account with this email already exists');

  const id = crypto.randomUUID();
  // Sign first: if the server is misconfigured this fails BEFORE an account is created.
  const token = await signToken(id, env.JWT_SECRET);
  const { hash, salt } = await hashPassword(password);
  await env.DB.batch([
    env.DB.prepare('INSERT INTO users (id, email, name, password_hash, password_salt) VALUES (?, ?, ?, ?, ?)')
      .bind(id, email, name, hash, salt),
    env.DB.prepare('INSERT INTO user_rewards (user_id, label) VALUES (?, ?)').bind(id, WELCOME_REWARD),
  ]);
  return json({ token, user: { id, email, name, points: 0 } }, 201);
}

// POST /api/auth/login  { email, password }
export async function login({ req, env }: Ctx): Promise<Response> {
  const b = await readJson<{ email?: string; password?: string }>(req);
  const email = (b.email || '').trim().toLowerCase();
  const user = await env.DB.prepare('SELECT id, email, name, password_hash, password_salt, points FROM users WHERE email = ?')
    .bind(email).first<UserRow>();
  // Same message for unknown email and wrong password.
  if (!user || !(await verifyPassword(b.password || '', user.password_hash, user.password_salt))) {
    throw new HttpError(401, 'Incorrect email or password');
  }
  return json({ token: await signToken(user.id, env.JWT_SECRET), user: { id: user.id, email: user.email, name: user.name, points: user.points } });
}

// GET /api/auth/me
export async function me({ req, env }: Ctx): Promise<Response> {
  const id = await requireUserId(req, env);
  const user = await env.DB.prepare('SELECT id, email, name, points FROM users WHERE id = ?').bind(id).first();
  if (!user) throw new HttpError(401, 'Please sign in');
  return json({ user });
}
