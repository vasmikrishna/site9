# Functional e2e

Exercises **real write paths** (login, create/publish page, contact-form
submission) for the live roles, using a seeded sandbox tenant. Complements the
default suite (`playwright.config.ts`) which only covers public + responsive UI.

## Live roles covered
- **Public visitor** — loads a tenant site, submits the contact form (writes an enquiry).
- **Owner / admin** — account dashboard (overview + My Sites tabs), admin portal
  (dashboard, pages, enquiries, billing), and create → publish → public render.

## Not covered (intentionally)
- **Client / employee portals** — `/client/*` and `/employee/*` routes are **not
  implemented** (only referenced in the sidebar nav). Nothing to test until built.
- **Super-admin** — `/superadmin` is gated on the env `ADMIN_EMAIL`/`ADMIN_PASSWORD`;
  no DB account exists to log in with, so it isn't driven here.

## Run

```bash
# 1. Seed (psql or Supabase SQL editor / MCP)
psql "$DATABASE_URL" -f e2e/functional/seed.sql

# 2. Run (defaults to production; override BASE_URL + sandbox origin for staging)
pnpm exec playwright test --config playwright.functional.config.ts

# 3. Clean up
psql "$DATABASE_URL" -f e2e/functional/cleanup.sql
```

Env overrides: `BASE_URL` (apex, default `https://site9.in`),
`E2E_SANDBOX_ORIGIN` (default `https://e2e-sandbox.site9.in`),
`E2E_PASSWORD` (default matches `seed.sql`), `E2E_RUN_ID` (unique page slug suffix).

> Prefer a staging DB. The suite writes real rows; against prod, always run
> `cleanup.sql` afterward (the seed/cleanup are scoped to the `e2e-sandbox` tenant
> and `@e2e.test` users only).
