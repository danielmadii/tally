<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Tally project notes

- Spec: `docs/blueprint.txt` (text mirror of the client blueprint docx). Follow it — especially §8 screens, §10 business rules, Appendix A schema.
- Mobile-first: salespeople use this on their phones 99% of the time. One-thumb use, large touch targets, sub-15-second sell flow.
- Sales + stock are an append-only ledger. Never edit or delete a sale — void/return only. All sale writes go through the `create_sale()` Postgres function (transactional, idempotency-keyed).
- Auth is custom phone+PIN (bcrypt) with a JWT session cookie (`src/lib/server/session.ts`); Supabase is used via service-role key server-side only. Authorization is enforced in the API layer against session role + shop scope.
- Catalogue is cached client-side in Dexie (`src/lib/client/db.ts`); search and barcode lookup must stay instant/local.
- DB: Supabase for now; PlanetScale is a possible future switch — keep SQL portable-ish and all data access behind `src/lib/server/queries.ts`.
- Apply schema with `supabase/migrations/0001_init.sql` + `supabase/seed.sql` (demo PINs are 1234).
- This is a solution for Iraq: currency is IQD (whole dinars), phone placeholders/numbers use Iraqi mobile formats (07xx xxx xxxx). RTL/Arabic is still an open decision.
- Icons: use lucide-react SVG icons everywhere — never emojis in UI.
- Manager/admin is a desktop-first, WordPress-style CMS: dark left sidebar via `src/app/manager/ManagerShell.tsx` (drawer on mobile). The salesperson app keeps its mobile bottom-tab shell (`SalesShell.tsx`).
- Design system (sell-to-enterprise polish): tokens + primitives live in `src/app/globals.css` — slate neutrals, single `--primary` accent (#9d174d) used sparingly, and component classes `.card`, `.btn`/`.btn-primary`/`.btn-secondary`/`.btn-ghost`, `.input`, `.badge-*`, `.page-title`, `.page-desc`, `.section-label`. Use these instead of ad-hoc utility piles; never reintroduce warm stone-* grays or raw pink-* classes.
