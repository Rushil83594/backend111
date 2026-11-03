import type { Builder } from '../types';
import { HttpError } from './http';

export interface PricedLine {
  unitCents: number;
  picked: string[];
}

/**
 * Validates a customer's selections against the builder rules stored in the
 * database and computes the price. The server never trusts prices from the app.
 */
export function priceSelections(b: Builder, selections: Record<string, string[]> | undefined): PricedLine {
  const sel = selections ?? {};
  const known = new Set(b.sections.map((s) => s.id));
  for (const k of Object.keys(sel)) {
    if (!known.has(k)) throw new HttpError(400, `"${k}" is not a section of ${b.name}`);
  }

  let total = 0;
  const picked: string[] = [];

  for (const s of b.sections) {
    const raw = sel[s.id] ?? [];
    if (!Array.isArray(raw)) throw new HttpError(400, `Selections for "${s.title}" must be a list`);
    let ids = [...new Set(raw.map(String))];

    if (ids.length === 0 && s.defaultIndex !== null && s.items[s.defaultIndex]) ids = [s.items[s.defaultIndex].id];
    if (s.required && ids.length === 0) throw new HttpError(400, `Please choose an option for "${s.title}"`);

    const max = s.mode === 'single' ? 1 : s.maxSelect ?? Infinity;
    if (ids.length > max) throw new HttpError(400, `"${s.title}" allows at most ${max}`);

    const chosen = ids.map((id) => {
      const item = s.items.find((i) => i.id === id);
      if (!item) throw new HttpError(400, `"${id}" is not available in "${s.title}"`);
      return item;
    });

    const prices = chosen.map((c) => c.priceCents).sort((a, c) => c - a);
    if (s.pricing === 'base_plus_extra' && prices.length > 0) {
      total += prices[0] + s.extraCents * (prices.length - 1);
    } else {
      total += prices.reduce((sum, p) => sum + p, 0);
    }
    for (const c of chosen) if (!c.name.startsWith('No ')) picked.push(c.name);
  }

  if (b.requireAny && picked.length === 0) throw new HttpError(400, `Choose at least one item from ${b.name}`);
  return { unitCents: total, picked };
}
