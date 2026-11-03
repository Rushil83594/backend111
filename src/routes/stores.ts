import type { Ctx } from '../types';
import { json } from '../lib/http';

// GET /api/stores?state=Texas&q=austin
export async function listStores({ env, url }: Ctx): Promise<Response> {
  const state = url.searchParams.get('state');
  const q = (url.searchParams.get('q') || '').trim();
  const like = `%${q}%`;
  const { results } = await env.DB.prepare(
    `SELECT id, name, address, city, state, zip, offers_pickup AS offersPickup, offers_delivery AS offersDelivery,
            delivery_fee_cents AS deliveryFeeCents
       FROM stores
      WHERE active = 1
        AND (?1 IS NULL OR state = ?1)
        AND (?2 = '' OR address LIKE ?3 OR city LIKE ?3 OR state LIKE ?3 OR zip LIKE ?3)
      ORDER BY state, city, address`,
  ).bind(state, q, like).all();
  return json({ stores: results });
}
