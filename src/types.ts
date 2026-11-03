export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ALLOWED_ORIGIN?: string;
}

export interface Ctx {
  req: Request;
  env: Env;
  url: URL;
  params: Record<string, string>;
}

export interface BItem {
  id: string;
  name: string;
  priceCents: number;
  calories: number;
  subtitle: string | null;
  tag: string | null;
}

export interface BSection {
  id: string;
  title: string;
  note: string | null;
  mode: 'single' | 'multi';
  maxSelect: number | null;
  required: boolean;
  defaultIndex: number | null;
  pricing: 'sum' | 'base_plus_extra';
  extraCents: number;
  items: BItem[];
}

export interface CategoryRow {
  slug: string;
  name: string;
  description: string;
  kind: 'builder' | 'cards' | 'chooser';
  require_any: number;
  parent_slug: string | null;
}

export interface Builder {
  slug: string;
  name: string;
  description: string;
  requireAny: boolean;
  sections: BSection[];
}
