# Brasa Verde API (Cloudflare Worker + D1)

Backend for the Brasa Verde Flutter app. The database is the single source of
truth for the menu, prices, stores, catering and rewards, so the app contains no
hardcoded content.

## Setup

```bash
npm install
cp .dev.vars.example .dev.vars          # then set a long random JWT_SECRET
npx wrangler d1 create brasa-verde-db   # copy the database_id into wrangler.toml
npm run db:migrate:local                # creates tables + seeds the menu locally
npm run dev                             # http://localhost:8787
```

Deploy:

```bash
npx wrangler secret put JWT_SECRET
npm run db:migrate:remote
npm run deploy
```

Set `ALLOWED_ORIGIN` in `wrangler.toml` to your Pages URL before going live.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | | liveness check |
| GET | `/api/stores?state=&q=` | | restaurant picker (NY, CA, TX samples) |
| GET | `/api/categories` | | Menu page tiles |
| GET | `/api/menu/:slug` | | a page: `kind` is `builder`, `cards` or `chooser` |
| GET | `/api/catering` | | tiers and products |
| GET | `/api/nutrition` | | calculator meals |
| GET | `/api/rewards/exchange` | | points tiers |
| POST | `/api/auth/signup` | | `{email, password, name?}` returns token |
| POST | `/api/auth/login` | | `{email, password}` returns token |
| GET | `/api/auth/me` | member | current user |
| GET | `/api/rewards/me` | member | points, rewards, activity |
| POST | `/api/rewards/redeem` | member | `{points}` exchange tier |
| POST | `/api/orders` | optional | place an order (members earn 10 pts per $1) |
| GET | `/api/orders` | member | order history |

Send the token as `Authorization: Bearer <token>`.

### Placing an order

```json
{
  "storeId": 5,
  "mode": "pickup",
  "lines": [
    { "category": "burrito",
      "selections": { "protein-std": ["pollo-asado", "steak"], "rice": ["white-rice"], "top": ["guacamole"] } },
    { "category": "drinks", "selections": { "tail-drinks": ["coke-zero"] }, "qty": 2 },
    { "cardId": "fam-chicken" },
    { "cateringId": "build-work", "people": 12 }
  ]
}
```

`selections` keys are the section ids and values are item ids, exactly as
returned by `GET /api/menu/:slug`. The server validates every rule (required,
max picks, items belonging to the section) and computes all prices itself.

## How the menu is modeled

`categories` (a page) -> `category_sections` (ordered, shareable) -> `sections`
(Protein, Rice, ...) -> `section_items` (price + calories per choice) -> `items`.
Ready-made products live in `menu_cards`. "Choose up to two proteins, second one
costs extra" is data: `pricing = 'base_plus_extra'`, `extra_cents = 250`.

## Changing data after launch

Never edit an applied migration. Add a new numbered file, for example
`migrations/0003_rebrand_prices.sql`, with plain `UPDATE` statements, then run
`npm run db:migrate:remote`. `scripts/generate_seed.py` only produces the first
seed (`0002`).

## Known limits (worth doing before real customers)

- No payment processing; orders are recorded as `received`.
- No rate limiting on login/signup (use Cloudflare WAF rules or Turnstile).
- Point redemption uses a guarded `UPDATE` followed by a batch; D1 has no
  interactive transactions, so a crash between the two could leave points
  deducted without the reward row.
- Delivery has a flat per-store fee and no address validation or radius check.
- Seed prices were read from screenshots; some were blurry.
