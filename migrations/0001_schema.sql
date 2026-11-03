-- Brasa Verde: database schema (Cloudflare D1 / SQLite)
-- Money is always stored as integer cents.

CREATE TABLE stores (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  name               TEXT NOT NULL,
  address            TEXT NOT NULL,
  city               TEXT NOT NULL,
  state              TEXT NOT NULL,
  zip                TEXT NOT NULL,
  offers_pickup      INTEGER NOT NULL DEFAULT 1,
  offers_delivery    INTEGER NOT NULL DEFAULT 1,
  delivery_fee_cents INTEGER NOT NULL DEFAULT 399,
  tax_bps            INTEGER NOT NULL,            -- tax rate in basis points (825 = 8.25%)
  active             INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_stores_state ON stores(state);

-- Every tile on the Menu page and every builder page.
CREATE TABLE categories (
  slug          TEXT PRIMARY KEY,                 -- 'burrito', 'kid-build', ...
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  kind          TEXT NOT NULL CHECK (kind IN ('builder','cards','chooser')),
  require_any   INTEGER NOT NULL DEFAULT 0,       -- builder needs at least one pick (chips, drinks)
  parent_slug   TEXT REFERENCES categories(slug), -- kid-build -> kids
  show_on_menu  INTEGER NOT NULL DEFAULT 1,
  blurb         TEXT,                             -- 'Serves 4 to 6 people'
  badge         TEXT,                             -- 'New', 'Digital only'
  sort          INTEGER NOT NULL DEFAULT 0
);

-- Reusable ingredient/product names.
CREATE TABLE items (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- One step of a builder: Protein, Rice, Beans, Drinks, ...
CREATE TABLE sections (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  note          TEXT,                              -- 'Choose up to two.'
  mode          TEXT NOT NULL DEFAULT 'multi' CHECK (mode IN ('single','multi')),
  max_select    INTEGER,                           -- NULL = unlimited (multi only)
  required      INTEGER NOT NULL DEFAULT 0,
  default_index INTEGER,                           -- preselected item position (0-based)
  pricing       TEXT NOT NULL DEFAULT 'sum' CHECK (pricing IN ('sum','base_plus_extra')),
  extra_cents   INTEGER NOT NULL DEFAULT 0         -- for base_plus_extra: added per extra pick
);

-- Which sections a builder page shows, in order. Sections can be shared.
CREATE TABLE category_sections (
  category_slug TEXT NOT NULL REFERENCES categories(slug),
  section_id    TEXT NOT NULL REFERENCES sections(id),
  sort          INTEGER NOT NULL,
  PRIMARY KEY (category_slug, section_id)
);

-- The choices inside a section, with their own price and calories.
CREATE TABLE section_items (
  section_id  TEXT NOT NULL REFERENCES sections(id),
  item_id     TEXT NOT NULL REFERENCES items(id),
  price_cents INTEGER NOT NULL DEFAULT 0,
  calories    INTEGER NOT NULL DEFAULT 0,
  subtitle    TEXT,
  tag         TEXT,
  sort        INTEGER NOT NULL,
  PRIMARY KEY (section_id, item_id)
);

-- Ready-made products (family meals, high protein menu).
CREATE TABLE menu_cards (
  id             TEXT PRIMARY KEY,
  category_slug  TEXT NOT NULL REFERENCES categories(slug),
  name           TEXT NOT NULL,
  serving        TEXT,
  calories_text  TEXT,
  price_cents    INTEGER NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  make_own_slug  TEXT REFERENCES categories(slug), -- "Make it my own" target
  sort           INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE catering_tiers (
  id                     TEXT PRIMARY KEY,
  name                   TEXT NOT NULL,
  badge                  TEXT,
  price_per_person_cents INTEGER NOT NULL,
  min_people             INTEGER NOT NULL DEFAULT 10,
  description            TEXT NOT NULL DEFAULT '',
  sort                   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE catering_products (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('build','chips','box')),
  name        TEXT NOT NULL,
  tag         TEXT,
  description TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL,
  unit        TEXT NOT NULL CHECK (unit IN ('person','order')),
  min_people  INTEGER NOT NULL DEFAULT 1,
  sort        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE rewards_exchange (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  points INTEGER NOT NULL UNIQUE,
  label  TEXT NOT NULL,
  sort   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE nutrition_meals (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  calories  INTEGER NOT NULL,
  fat_g     INTEGER NOT NULL,
  protein_g INTEGER NOT NULL,
  carbs_g   INTEGER NOT NULL,
  sort      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  points        INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE orders (
  id               TEXT PRIMARY KEY,
  user_id          TEXT REFERENCES users(id),
  store_id         INTEGER NOT NULL REFERENCES stores(id),
  mode             TEXT NOT NULL CHECK (mode IN ('pickup','delivery')),
  delivery_address TEXT,
  status           TEXT NOT NULL DEFAULT 'received',
  subtotal_cents   INTEGER NOT NULL,
  tax_cents        INTEGER NOT NULL,
  delivery_cents   INTEGER NOT NULL DEFAULT 0,
  total_cents      INTEGER NOT NULL,
  points_earned    INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_orders_user ON orders(user_id, created_at);

CREATE TABLE order_lines (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id         TEXT NOT NULL REFERENCES orders(id),
  name             TEXT NOT NULL,
  detail           TEXT NOT NULL DEFAULT '',
  unit_price_cents INTEGER NOT NULL,
  qty              INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL
);
CREATE INDEX idx_lines_order ON order_lines(order_id);

CREATE TABLE reward_ledger (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users(id),
  delta      INTEGER NOT NULL,
  reason     TEXT NOT NULL,
  order_id   TEXT REFERENCES orders(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_ledger_user ON reward_ledger(user_id, created_at);

-- Free items a member can use (welcome reward, exchanged points).
CREATE TABLE user_rewards (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users(id),
  label      TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','redeemed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_user_rewards ON user_rewards(user_id, status);
