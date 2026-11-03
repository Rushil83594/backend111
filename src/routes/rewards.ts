import type { Ctx } from '../types';
import { HttpError, json, readJson } from '../lib/http';
import { requireUserId } from '../lib/auth';

// GET /api/rewards/exchange
export async function listExchange({ env }: Ctx): Promise<Response> {
  const { results } = await env.DB.prepare('SELECT points, label FROM rewards_exchange ORDER BY sort').all();
  return json({ tiers: results });
}

// GET /api/rewards/me  -> balance, available rewards, recent activity
export async function myRewards({ req, env }: Ctx): Promise<Response> {
  const id = await requireUserId(req, env);
  const user = await env.DB.prepare('SELECT points FROM users WHERE id = ?').bind(id).first<{ points: number }>();
  const rewards = await env.DB.prepare(
    `SELECT id, label, status, created_at AS createdAt FROM user_rewards WHERE user_id = ? ORDER BY id DESC`,
  ).bind(id).all();
  const ledger = await env.DB.prepare(
    `SELECT delta, reason, created_at AS createdAt FROM reward_ledger WHERE user_id = ? ORDER BY id DESC LIMIT 50`,
  ).bind(id).all();
  return json({ points: user?.points ?? 0, rewards: rewards.results, ledger: ledger.results });
}

// POST /api/rewards/redeem  { points }   (points = which exchange tier)
export async function redeem({ req, env }: Ctx): Promise<Response> {
  const id = await requireUserId(req, env);
  const b = await readJson<{ points?: number }>(req);
  const tier = await env.DB.prepare('SELECT points, label FROM rewards_exchange WHERE points = ?')
    .bind(Number(b.points)).first<{ points: number; label: string }>();
  if (!tier) throw new HttpError(400, 'Unknown reward');

  // Guarded update: only succeeds if the balance is high enough.
  const upd = await env.DB.prepare('UPDATE users SET points = points - ?1 WHERE id = ?2 AND points >= ?1')
    .bind(tier.points, id).run();
  if (upd.meta.changes === 0) throw new HttpError(400, 'Not enough points for this reward');

  await env.DB.batch([
    env.DB.prepare('INSERT INTO reward_ledger (user_id, delta, reason) VALUES (?, ?, ?)').bind(id, -tier.points, `Exchanged for ${tier.label}`),
    env.DB.prepare('INSERT INTO user_rewards (user_id, label) VALUES (?, ?)').bind(id, tier.label),
  ]);
  const user = await env.DB.prepare('SELECT points FROM users WHERE id = ?').bind(id).first<{ points: number }>();
  return json({ ok: true, label: tier.label, points: user?.points ?? 0 });
}
