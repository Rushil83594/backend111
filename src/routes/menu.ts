import type { Ctx } from '../types';
import { HttpError, json } from '../lib/http';
import { getBuilder, getCategory } from '../lib/menuQuery';

// GET /api/categories  -> the tiles on the Menu page
export async function listCategories({ env }: Ctx): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT slug, name, blurb, badge FROM categories WHERE show_on_menu = 1 ORDER BY sort`,
  ).all();
  return json({ categories: results });
}

// GET /api/menu/:slug  -> everything a builder / cards / chooser page needs
export async function getMenu({ env, params }: Ctx): Promise<Response> {
  const cat = await getCategory(env.DB, params.slug);
  if (!cat) throw new HttpError(404, 'Menu category not found');

  if (cat.kind === 'cards') {
    const { results } = await env.DB.prepare(
      `SELECT id, name, serving, calories_text AS caloriesText, price_cents AS priceCents, description,
              make_own_slug AS makeOwnSlug
         FROM menu_cards WHERE category_slug = ? ORDER BY sort`,
    ).bind(cat.slug).all();
    return json({ kind: 'cards', slug: cat.slug, name: cat.name, description: cat.description, cards: results });
  }

  if (cat.kind === 'chooser') {
    const { results } = await env.DB.prepare(
      `SELECT slug, name FROM categories WHERE parent_slug = ? ORDER BY sort`,
    ).bind(cat.slug).all();
    return json({ kind: 'chooser', slug: cat.slug, name: cat.name, description: cat.description, options: results });
  }

  return json({ kind: 'builder', ...(await getBuilder(env.DB, cat)) });
}
