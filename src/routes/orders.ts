import type { Ctx } from '../types';
import { HttpError, json, readJson } from '../lib/http';
import { optionalUserId, requireUserId } from '../lib/auth';
import { getBuilder, getCategory } from '../lib/menuQuery';
import { priceSelections } from '../lib/pricing';

const POINTS_PER_DOLLAR = 10;
const MAX_LINES = 25;
const MAX_QTY = 20;

interface LineIn {
  cardId?: string;                          // a ready-made card (family meal, high protein)
  category?: string;                        // a builder (burrito, tacos, drinks, ...)
  selections?: Record<string, string[]>;
  cateringId?: string;                      // a catering product
  people?: number;
  qty?: number;
}
interface OrderIn {
  storeId?: number;
  mode?: 'pickup' | 'delivery';
  deliveryAddress?: string;
  lines?: LineIn[];
}
interface PricedOrderLine { name: string; detail: string; unit: number; qty: number }

const int = (v: unknown, min: number, max: number, label: string): number => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `${label} must be a whole number from ${min} to ${max}`);
  return n;
};

async function priceLine(env: Ctx['env'], line: LineIn): Promise<PricedOrderLine> {
  if (line.cardId) {
    const card = await env.DB.prepare('SELECT name, price_cents FROM menu_cards WHERE id = ?')
      .bind(line.cardId).first<{ name: string; price_cents: number }>();
    if (!card) throw new HttpError(400, `Unknown menu item "${line.cardId}"`);
    return { name: card.name, detail: '', unit: card.price_cents, qty: int(line.qty ?? 1, 1, MAX_QTY, 'Quantity') };
  }
  if (line.cateringId) {
    type CateringRow = { name: string; unit: string; price_cents: number; min_people: number };
    let p = await env.DB.prepare('SELECT name, unit, price_cents, min_people FROM catering_products WHERE id = ?')
      .bind(line.cateringId).first<CateringRow>();
    if (!p) {
      // "Build your own" tiers (single / double / triple) are priced per person.
      p = await env.DB.prepare(
        "SELECT 'Build your own: ' || name AS name, 'person' AS unit, price_per_person_cents AS price_cents, min_people FROM catering_tiers WHERE id = ?",
      ).bind(line.cateringId).first<CateringRow>();
    }
    if (!p) throw new HttpError(400, `Unknown catering item "${line.cateringId}"`);
    if (p.unit === 'order') return { name: p.name, detail: 'Catering', unit: p.price_cents, qty: int(line.qty ?? 1, 1, MAX_QTY, 'Quantity') };
    const people = int(line.people, p.min_people, 500, `Number of people (minimum ${p.min_people})`);
    return { name: p.name, detail: `Catering for ${people} people`, unit: p.price_cents * people, qty: 1 };
  }
  if (line.category) {
    const cat = await getCategory(env.DB, line.category);
    if (!cat || cat.kind !== 'builder') throw new HttpError(400, `"${line.category}" cannot be ordered`);
    const priced = priceSelections(await getBuilder(env.DB, cat), line.selections);
    return { name: cat.name, detail: priced.picked.join(', '), unit: priced.unitCents, qty: int(line.qty ?? 1, 1, MAX_QTY, 'Quantity') };
  }
  throw new HttpError(400, 'Each line needs a cardId, category or cateringId');
}

// POST /api/orders  (sign-in optional; signed-in members earn points)
export async function createOrder({ req, env }: Ctx): Promise<Response> {
  const b = await readJson<OrderIn>(req);
  if (b.mode !== 'pickup' && b.mode !== 'delivery') throw new HttpError(400, 'mode must be "pickup" or "delivery"');
  if (!Array.isArray(b.lines) || b.lines.length === 0) throw new HttpError(400, 'Your bag is empty');
  if (b.lines.length > MAX_LINES) throw new HttpError(400, `Orders are limited to ${MAX_LINES} items`);

  const store = await env.DB.prepare(
    'SELECT id, offers_pickup, offers_delivery, delivery_fee_cents, tax_bps FROM stores WHERE id = ? AND active = 1',
  ).bind(Number(b.storeId)).first<{ id: number; offers_pickup: number; offers_delivery: number; delivery_fee_cents: number; tax_bps: number }>();
  if (!store) throw new HttpError(400, 'Choose a restaurant first');
  if (b.mode === 'pickup' && !store.offers_pickup) throw new HttpError(400, 'This restaurant does not offer pickup');
  if (b.mode === 'delivery' && !store.offers_delivery) throw new HttpError(400, 'This restaurant does not offer delivery');
  const address = (b.deliveryAddress || '').trim().slice(0, 200);
  if (b.mode === 'delivery' && address.length < 5) throw new HttpError(400, 'Enter a delivery address');

  const lines: PricedOrderLine[] = [];
  for (const l of b.lines) lines.push(await priceLine(env, l));

  const subtotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
  const tax = Math.round((subtotal * store.tax_bps) / 10_000);
  const delivery = b.mode === 'delivery' ? store.delivery_fee_cents : 0;
  const total = subtotal + tax + delivery;

  const userId = await optionalUserId(req, env);
  const points = userId ? Math.floor(subtotal / 100) * POINTS_PER_DOLLAR : 0;
  const id = crypto.randomUUID();

  const stmts = [
    env.DB.prepare(
      `INSERT INTO orders (id, user_id, store_id, mode, delivery_address, subtotal_cents, tax_cents, delivery_cents, total_cents, points_earned)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, userId, store.id, b.mode, b.mode === 'delivery' ? address : null, subtotal, tax, delivery, total, points),
    ...lines.map((l) =>
      env.DB.prepare(
        'INSERT INTO order_lines (order_id, name, detail, unit_price_cents, qty, line_total_cents) VALUES (?, ?, ?, ?, ?, ?)',
      ).bind(id, l.name, l.detail, l.unit, l.qty, l.unit * l.qty),
    ),
  ];
  if (userId && points > 0) {
    stmts.push(
      env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(points, userId),
      env.DB.prepare('INSERT INTO reward_ledger (user_id, delta, reason, order_id) VALUES (?, ?, ?, ?)').bind(userId, points, 'Order points', id),
    );
  }
  await env.DB.batch(stmts); // all-or-nothing

  return json({
    order: { id, mode: b.mode, subtotalCents: subtotal, taxCents: tax, deliveryCents: delivery, totalCents: total, pointsEarned: points, status: 'received' },
    lines: lines.map((l) => ({ ...l, lineTotalCents: l.unit * l.qty })),
  }, 201);
}

// GET /api/orders  -> the signed-in member's order history
export async function listOrders({ req, env }: Ctx): Promise<Response> {
  const userId = await requireUserId(req, env);
  const orders = await env.DB.prepare(
    `SELECT id, mode, status, subtotal_cents AS subtotalCents, tax_cents AS taxCents, delivery_cents AS deliveryCents,
            total_cents AS totalCents, points_earned AS pointsEarned, created_at AS createdAt
       FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
  ).bind(userId).all<{ id: string }>();
  if (orders.results.length === 0) return json({ orders: [] });

  const ids = orders.results.map((o) => o.id);
  const lines = await env.DB.prepare(
    `SELECT order_id AS orderId, name, detail, unit_price_cents AS unitPriceCents, qty, line_total_cents AS lineTotalCents
       FROM order_lines WHERE order_id IN (${ids.map(() => '?').join(',')}) ORDER BY id`,
  ).bind(...ids).all<{ orderId: string }>();

  return json({ orders: orders.results.map((o) => ({ ...o, lines: lines.results.filter((l) => l.orderId === o.id) })) });
}
