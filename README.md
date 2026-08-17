# Tally — Retail Sales Attribution & Stock

A mobile-first installable PWA for a multi-shop cosmetics chain: every sale is
recorded under the salesperson who made it, per-shop stock stays accurate, and
management gets a live picture. Full spec in `docs/Sales_Attribution_System_Blueprint.docx`
(plain-text mirror: `docs/blueprint.txt`).

## Stack

- **Next.js (App Router) + TypeScript + Tailwind**, one codebase for the phone
  app and the manager dashboard, shipped as a PWA (no app store)
- **Supabase** (managed Postgres) — schema in `supabase/migrations/`, sales and
  stock are an append-only ledger written through one transactional
  `create_sale()` function with idempotency keys
- **Barcode scanning**: native `BarcodeDetector` on Android Chrome, ZXing
  fallback on iOS Safari (EAN-13 / UPC-A / Code-128)
- **Dexie (IndexedDB) + TanStack Query** — the catalogue is cached on the phone
  so search and barcode lookup are instant, no network round-trip
- **Recharts** for manager charts

## Getting started (local)

Requires Docker running. The Supabase CLI is a dev dependency.

1. Start the local Supabase stack — this applies every migration in
   `supabase/migrations/` and the demo seed automatically:

   ```sh
   npx supabase start        # first run downloads images (a few minutes)
   ```

2. Point `.env.local` at it. `npx supabase status` prints the values; locally:

   ```
   SUPABASE_URL=http://127.0.0.1:54321
   SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY from supabase status>
   AUTH_SECRET=<any long random string>
   NEXT_PUBLIC_CURRENCY=USD
   CRON_SECRET=<any string>
   ```

3. Run the app (port 3000 may be taken by other projects):

   ```sh
   npm run dev -- --port 3100
   ```

   Then open http://localhost:3100 and log in with a demo account below.
   Supabase Studio (browse the database) is at http://127.0.0.1:54323.

Useful: `npx supabase db reset` re-applies migrations + seed from scratch;
`npx supabase stop` shuts the stack down. Camera scanning requires HTTPS or
localhost — to test scanning from a phone, use a tunnel (ngrok) or a preview
deploy.

For a hosted Supabase project instead: run the three migration files and
`seed.sql` against it in order, and use its URL + service-role key.

## Demo logins (seed data, PIN `1234`)

Demo data is localised for Iraq: IQD prices, Iraqi mobile numbers, Baghdad shops.

| Phone | Name | Role |
|---|---|---|
| 07701000001 | Amira Owner | admin |
| 07701000002 | Salma Lead | supervisor |
| 07701000003 | Layla Hassan | salesperson (Mansour Mall) |
| 07801000005 | Dina Farouk | salesperson (Zayouna) |

Generate a PIN hash for real users: `node scripts/hash-pin.mjs 4321`

## Layout

- `src/app/` — salesperson screens (`/`, `/sell`, `/sales`), manager views
  (`/manager`, `/manager/leaderboard`, `/manager/stock`), API routes (`/api/*`)
- `src/lib/server/` — session (JWT cookie), Supabase service-role client, queries
- `src/lib/client/` — Dexie catalogue cache and sync
- `supabase/` — migrations and seed

## Status vs. blueprint

Phases 1–2 are implemented: auth + roles, catalogue + instant search, scanning,
basket/confirm with idempotent transactional writes, stock decrement, my-sales
with void requests, live dashboard, leaderboard with pro-rated attainment and
CSV export, product performance + dead-stock reports, stock view with low-stock
flags and stock-in (manual + CSV), void approval workflow (same-day rule for
supervisors), returns by sale number, till reconciliation with variance,
exceptions report, monthly target admin, and a nightly summary/stock-discrepancy
cron (`/api/cron/summarize`, scheduled in `vercel.ts`, protected by
`CRON_SECRET`). Apply both migrations: `0001_init.sql` then `0002_phase2.sql`.

The Admin area (`/manager/admin`, admin role only) covers users (create,
PIN reset, role change, date-ranged shop transfers, deactivate), shops
(create/deactivate — never delete), catalogue maintenance (add products with
variants and barcodes, inline price edits that append to price_history,
deactivate), and the audit-log viewer.

Not yet built: PDF exports, physical stock counts, salesperson profile
drill-down, RTL/localisation.
