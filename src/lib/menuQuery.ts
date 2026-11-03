import type { BSection, Builder, CategoryRow } from '../types';

export async function getCategory(db: D1Database, slug: string): Promise<CategoryRow | null> {
  return db
    .prepare('SELECT slug, name, description, kind, require_any, parent_slug FROM categories WHERE slug = ?')
    .bind(slug)
    .first<CategoryRow>();
}

interface Row {
  section_id: string; title: string; note: string | null; mode: 'single' | 'multi';
  max_select: number | null; required: number; default_index: number | null;
  pricing: 'sum' | 'base_plus_extra'; extra_cents: number;
  item_id: string; name: string; price_cents: number; calories: number;
  subtitle: string | null; tag: string | null;
}

/** Loads every section (with its items) for a builder page, in display order. */
export async function getBuilder(db: D1Database, cat: CategoryRow): Promise<Builder> {
  const { results } = await db
    .prepare(
      `SELECT s.id AS section_id, s.title, s.note, s.mode, s.max_select, s.required, s.default_index,
              s.pricing, s.extra_cents, si.item_id, i.name, si.price_cents, si.calories, si.subtitle, si.tag
         FROM category_sections cs
         JOIN sections s ON s.id = cs.section_id
         JOIN section_items si ON si.section_id = s.id
         JOIN items i ON i.id = si.item_id
        WHERE cs.category_slug = ?
        ORDER BY cs.sort, si.sort`,
    )
    .bind(cat.slug)
    .all<Row>();

  const sections: BSection[] = [];
  const byId = new Map<string, BSection>();
  for (const r of results) {
    let sec = byId.get(r.section_id);
    if (!sec) {
      sec = {
        id: r.section_id, title: r.title, note: r.note, mode: r.mode, maxSelect: r.max_select,
        required: r.required === 1, defaultIndex: r.default_index, pricing: r.pricing,
        extraCents: r.extra_cents, items: [],
      };
      byId.set(r.section_id, sec);
      sections.push(sec);
    }
    sec.items.push({
      id: r.item_id, name: r.name, priceCents: r.price_cents, calories: r.calories,
      subtitle: r.subtitle, tag: r.tag,
    });
  }
  return { slug: cat.slug, name: cat.name, description: cat.description, requireAny: cat.require_any === 1, sections };
}
