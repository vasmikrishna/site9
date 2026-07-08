# Site9 — Test Plan

_Last updated: 2026-06-29_

Covers the **currently live** features only. Site9 is an admin-only multi-tenant
website builder; the legacy client/employee portals have been removed.

## 1. Scope

**In scope (live):**
- Public marketing site (apex `site9.in`): landing, pricing, templates, open-source, blog
- Auth: register, login (email/password + Google), forgot-password
- Account dashboard (`/dashboard`): Dashboard + My Sites tabs
- Owner/admin portal (`/admin/*`): dashboard, pages, blog, enquiries, billing, domain; builder (`/build`)
- Public tenant sites (`{slug}.site9.in`): pages, blog, contact, published custom pages (`/p/{slug}`)
- Super-admin console (`/superadmin/*`): dashboard, users, sites, payments, builder content
- Cross-cutting: responsiveness, session/auth, multi-tenant isolation, billing (Razorpay)

**Out of scope:**
- Client/employee portals (removed — feature-flagged off, no routes)
- Agency/CRM modules (projects, bookings, orders, surveys, social, portfolio — `FEATURES` off)
- Third-party internals (Razorpay checkout widget, Google OAuth provider, email delivery)

## 2. Environments

| Env | URL | Notes |
|-----|-----|-------|
| Production | `https://site9.in`, `https://{slug}.site9.in` | Vercel project `0tox`, Supabase `ajchxovpiqvrgztywrxv` |
| Local | `http://localhost:3001`, `{slug}.localhost` | Needs `.env.local`; service-role key required for admin/super-admin data |

Browsers: latest Chrome (primary), Safari/iOS, Android Chrome.
Viewports: **mobile 390px, tablet 768px, desktop 1280px**.

## 3. Roles & test data

| Role | How to get it | Live? |
|------|---------------|-------|
| Anonymous visitor | none | ✅ |
| Owner / admin | register, or seed via `e2e/functional/seed.sql` | ✅ |
| Super-admin | env `ADMIN_EMAIL`/`ADMIN_PASSWORD` (no DB account) | ✅ |
| Client / employee | — | ❌ removed |

Functional e2e seeds an isolated `e2e-sandbox` tenant + `@e2e.test` users; always
run `e2e/functional/cleanup.sql` after. Prefer a staging DB over prod.

## 4. Automated coverage (Playwright)

| Suite | File | Runs against | What it covers |
|-------|------|--------------|----------------|
| Responsive audit | `e2e/responsive.spec.ts` | local or prod | Every public/auth route × 3 viewports, asserts **no horizontal overflow** |
| Public smoke | `e2e/public-smoke.spec.ts` | local or prod | Hero CTAs, **mobile hamburger nav** (incl. cross-page regression), marketing routes, login form |
| Functional — roles | `e2e/functional/*.spec.ts` | seeded env | Login, dashboard tabs, admin portal reads, **create→publish→public render**, contact-form submit, super-admin console |

Commands:
```bash
# Public + responsive (no auth)
BASE_URL=https://site9.in pnpm test:e2e

# Functional (seed first, cleanup after)
pnpm exec playwright test --config playwright.functional.config.ts

# Super-admin (needs creds)
E2E_SUPERADMIN_EMAIL=… E2E_SUPERADMIN_PASSWORD=… BASE_URL=https://site9.in \
  pnpm exec playwright test --config playwright.functional.config.ts --project=superadmin
```

## 5. Manual test cases

### 5.1 Public / marketing
- [ ] Landing renders; hero CTAs ("Create your website", "Browse templates") work
- [ ] Mobile (≤375px): hamburger opens; nav links + Sign in/Get started reachable
- [ ] **Navigate menu → Pricing → reopen menu → Templates** (regression: menu must stay reachable)
- [ ] Pricing page: plan comparison renders; Subscribe/Get started CTAs
- [ ] Templates gallery loads; open a template preview
- [ ] Open-source page loads; GitHub CTAs
- [ ] Dark/light theme toggle persists across pages
- [ ] No horizontal scroll on any page at 390/768/1280

### 5.2 Auth
- [ ] Register new account (email/password ≥8 chars) → lands on dashboard
- [ ] Duplicate email → "account already exists"
- [ ] Login with correct creds → dashboard; wrong creds → error
- [ ] Google sign-in flow (manual)
- [ ] Logout clears session; protected routes redirect to /login
- [ ] Session shared across `*.site9.in` subdomains

### 5.3 Account dashboard (`/dashboard`)
- [ ] **Dashboard tab**: plan + quota ("X of Y sites used"), stat cards (sites, published, drafts, enquiries, pages, blog posts), quick actions
- [ ] **My Sites tab**: site cards with Edit / Manage / View
- [ ] Create new site → builder; quota gate at limit shows Upgrade
- [ ] Switch active site → admin opens for that tenant

### 5.4 Owner/admin portal (`/admin/*`)
- [ ] Sidebar: mobile hamburger → drawer (≤768px); sticky on desktop
- [ ] Dashboard counts scoped to the **active tenant only** (not all tenants)
- [ ] Pages: list, create (template/blank/AI), edit, **publish → renders at `/p/{slug}`**, set homepage, unpublish, delete
- [ ] Blog: create/edit/publish post; renders on public blog
- [ ] Enquiries: submitted contact forms appear; status changes; reply
- [ ] Billing: no-sub state shows Subscribe Monthly/Annual; active state shows plan, renewal/cancel date, switch plan, cancel-at-period-end; invoice history
- [ ] Domain: add custom domain, DNS instructions, verification

### 5.5 Public tenant site (`{slug}.site9.in`)
- [ ] Homepage / published custom pages render (sanitized HTML/CSS)
- [ ] Contact form submits → success → enquiry recorded for that tenant
- [ ] Draft pages NOT publicly accessible
- [ ] Tenant header responsive (mobile menu)

### 5.6 Super-admin (`/superadmin`)
- [ ] Gate: only `ADMIN_EMAIL` session reaches it; others redirect to /login
- [ ] **Mobile: hamburger + drawer; content not cut off** (≤768px)
- [ ] Dashboard totals: sites, active subscriptions, revenue, recent sites
- [ ] Users: list with per-account site counts
- [ ] Sites: all tenants with owner + subscription status
- [ ] Payments: invoices + revenue
- [ ] Builder content: templates / sections / reference-sites / palettes CRUD

### 5.7 Billing (Razorpay) — manual, use test mode
- [ ] Subscribe monthly/annual → Razorpay checkout → verify → active
- [ ] Switch plan monthly↔annual
- [ ] Cancel → `cancel_at_period_end`, access until period end
- [ ] Webhook updates status; invoice + receipt recorded

## 6. Responsiveness matrix
Each surface verified at 390 / 768 / 1280 px — no horizontal overflow, nav reachable,
CTAs not clipped: landing, pricing, templates, open-source, auth pages, account
dashboard, admin portal, tenant public site, super-admin console.

## 7. Multi-tenant isolation
- [ ] Tenant A admin cannot read Tenant B's pages/enquiries/blog
- [ ] Admin portal on apex resolves the active tenant via `x-tenant-slug` (session)
- [ ] Published pages are scoped per tenant + slug

## 8. Regression checklist (pre-release)
- [ ] `pnpm exec tsc --noEmit` clean
- [ ] `pnpm build` succeeds
- [ ] `BASE_URL=https://site9.in pnpm test:e2e` green (public + responsive)
- [ ] Functional suite green against a seeded env (then cleanup)
- [ ] Spot-check the area changed on mobile + desktop

## 9. Known gaps / risks
- Super-admin browser e2e not yet run in CI (needs credentials/service-role of the prod project).
- Authenticated admin/super-admin pages need the **service-role key** to run locally.
- Billing requires Razorpay **test keys**; without them the dev fallback path is used.
- 2 abandoned `created` subscriptions exist in prod data (no paid invoice).
