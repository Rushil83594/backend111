import type { Ctx } from '../types';
import { json } from '../lib/http';

// GET /api/catering
export async function getCatering({ env }: Ctx): Promise<Response> {
  const tiers = await env.DB.prepare(
    `SELECT id, name, badge, price_per_person_cents AS pricePerPersonCents, min_people AS minPeople, description
       FROM catering_tiers ORDER BY sort`,
  ).all();
  const products = await env.DB.prepare(
    `SELECT id, kind, name, tag, description, price_cents AS priceCents, unit, min_people AS minPeople
       FROM catering_products ORDER BY sort`,
  ).all();
  return json({ tiers: tiers.results, products: products.results });
}

// GET /api/nutrition
export async function getNutrition({ env }: Ctx): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT id, name, calories, fat_g AS fatG, protein_g AS proteinG, carbs_g AS carbsG FROM nutrition_meals ORDER BY sort`,
  ).all();
  return json({ meals: results });
}
