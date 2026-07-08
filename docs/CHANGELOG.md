# Changelog

## [Unreleased]

### Fixed — Tenant subdomains were de-indexed by a hardcoded canonical (#24)
- **Homepage canonical bug.** `src/app/page.tsx` exported a **static** `metadata` block, so every tenant subdomain homepage emitted `<link rel="canonical" href="https://site9.in">` and the generic title "Site9 — One Website for Every Business" — telling Google the apex was the real page and to skip the subdomain. None of the live tenant sites could be indexed. Replaced with `generateMetadata()`: a subdomain with a **published homepage** now canonicals to its own origin with its business name; the apex (and tenants showing the marketing fallback) keep the apex metadata so they aren't indexed as duplicates. Inner pages were already correct via `(public)/layout.tsx`.
- **Sitemap index.** New apex-only `/sitemap-index.xml` lists every live tenant's sitemap (active + published homepage, same rule as `/sites`), referenced from the apex `robots.txt`. One URL to submit in Search Console now leads Google to all `*.site9.in` sites.
- Note: the stale `biharstartupsclub`/`controlpanel`/`lavanyapurefood.site9.in` URLs seen in Search Console are historical entries from a previous owner of the domain — unrelated to the platform; they age out or can be removed in GSC.

### Added — Platform SEO hardening (#5)
- **Apex sitemap fix.** `sitemap.ts` no longer early-returns 5 static URLs for the main site — the apex (`site9.in`) now lists published blog posts and custom pages too, so the platform's own content (incl. the daily content engine) gets submitted. `/blog` marked `changeFrequency: daily`.
- **Search-console verification.** Root metadata emits Google/Bing verification tags from `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` / `NEXT_PUBLIC_BING_SITE_VERIFICATION` (GSC domain-property via DNS already covers all `*.site9.in`).
- **IndexNow.** `src/lib/indexnow.ts` (`submitToIndexNow`, grouped per host, best-effort) + key route `/api/indexnow-key` (env `INDEXNOW_KEY`). Fired on blog publish (POST) and publish-on-edit (PATCH) so Bing/Yandex recrawl in minutes.
- **RSS feed.** Tenant-aware RSS 2.0 at `/blog/feed.xml` (latest 50 published posts) + `<link rel="alternate" type="application/rss+xml">` on the blog index.
- **Structured data.** Added `Organization` (apex layout) and `BreadcrumbList` (blog post: Home → Blog → Post) JSON-LD alongside the existing WebSite/LocalBusiness/BlogPosting.
- **Dynamic OG images.** `next/og` `ImageResponse` cards: per-post (`(public)/blog/[slug]/opengraph-image.tsx`) and a branded site default (`(public)/opengraph-image.tsx`), both tinted with the tenant's primary colour.
- **New env vars.** `INDEXNOW_KEY`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_BING_SITE_VERIFICATION` (all optional).

### Added — Social Media Management (Instagram + Facebook, mock-first)
- **Connections tab.** Per-platform (Instagram / Facebook) account management. With `SOCIAL_MOCK=1` (or no `META_APP_ID`) the connect flow uses `MockProvider` and seeds a demo account immediately — no Meta credentials required. Real OAuth flows to `/api/social/meta/start` → `/api/social/meta/callback`. Account tokens are stored AES-256-GCM encrypted (`src/lib/social/crypto.ts`).
- **Calendar tab.** Chronological view of scheduled, published, and failed posts. "New Post" opens the Composer from any state.
- **Composer.** Full-screen dialog (`social-composer`) with caption (2 200-char counter), hashtag tokeniser, drag-and-drop image upload (`/api/admin/social/upload`), per-account checkboxes, live Instagram/Facebook platform preview, and three timing modes: Save Draft / Publish Now / Schedule (datetime-local picker).
- **Drafts & AI tab.** Lists `draft` and `ready` posts. AI Content Generation card calls `POST /api/admin/social/generate` (Tavily discovery + DeepSeek/Gemini drafting via `src/lib/social/discover.ts`). Generated cards show source link, caption, hashtags, inline platform preview, and Approve & Schedule action.
- **Settings tab.** Auto-generate toggle, auto-publish toggle, niche/industry, keywords (comma/space-separated), tone of voice (Friendly / Professional / Playful / Bold), posts-per-run count — persisted in `social_settings` per tenant.
- **Cron automation.** `GET /api/cron/social-publish` runs every 5 min (publish due posts); `GET /api/cron/social-discover` runs every 6 h (AI discovery run). Both declared in `vercel.json` and gated by `CRON_SECRET`.
- **Data model.** Four new tables (all RLS-disabled + grants, per project convention): `social_accounts`, `social_posts`, `social_post_targets`, `social_settings` (`019_social.sql`). Provider abstraction in `src/lib/social/provider.ts` (`MockProvider` / `MetaProvider`); `publish.ts` drives the actual posting.
- **Feature flag + nav.** `social: true` in `src/lib/features.ts`; sidebar entry in `portal-sidebar.tsx`; middleware gate on `/admin/social`.
- **New env vars.** `META_APP_ID`, `META_APP_SECRET`, `META_OAUTH_REDIRECT`, `SOCIAL_TOKEN_ENC_KEY`, `CRON_SECRET`, `TAVILY_API_KEY`, `SOCIAL_MOCK=1`. All documented in `social.env.example`.

### Added — Customer accounts + unified "My Businesses" hub (#7)
- **Public entry points.** Each tenant's public site header now shows **Sign in / Sign up** when logged out, and a **My account** dropdown (→ My businesses, My dashboard, Sign out) when logged in. `(public)/layout.tsx` reads the shared session and passes it to `components/site/header.tsx`.
- **Unified hub** at `/account` (new `(account)` route group). Lists every tenant the person belongs to, split into **Businesses you own** (role `admin`), **You're a customer of** (role `client`), and **Businesses you work with** (role `employee`). Each card's **Enter** switches the session to that tenant (`/api/auth/switch-workspace`) and navigates to its subdomain. Plus a "Create a new website" CTA (→ `/start`). The route lives outside the `(client)/(admin)/(employee)` groups so it is **not** subject to subdomain tenant-isolation; the page enforces auth itself (no middleware change).
- **Customer portal views** in `(client)`: **My Orders** (`/client/orders` + detail, scoped by `customer_id` + `tenant_id`), **My Bookings** (`/client/bookings`, by email + tenant), and **Profile** (`/client/profile`). Sidebar nav gains these (Orders/Bookings gated by `FEATURES.ecommerce` / `FEATURES.bookings`).
- **Booking↔customer linkage.** `bookings.customer_id` added (`015_bookings_customer_id.sql`, backfilled by email-in-tenant); `POST /api/book` now sets it when the requester is signed into that tenant.
- Shared `getWorkspacesForEmail()` helper (`src/lib/workspaces.ts`); `/api/auth/workspaces` refactored onto it. Built on the existing model (no memberships-table refactor) — no schema change to identity. All new reads run server-side (service role) filtered by **both** user identity and current `tenant_id`.

### Added — Search + pagination across list/table views (#6)
- New reusable client component `src/components/paginated-list.tsx`: a search box + Previous/Next pager (with a result count) that filters the passed-in rows case-insensitively and slices to the current page. Controls auto-hide when not needed (pager only shows once results exceed the page size).
- Applied across **16 management lists**. Server-component pages keep their Supabase query and delegate rendering to a sibling `"use client"` `*-list.tsx` that paginates the already-fetched rows:
  - **Superadmin:** Tenants, Blog, Palettes, Reference Sites (search + pagination); Templates, Sections (search only — status grouping preserved).
  - **Admin:** Clients, Employees, Projects, Surveys, Payments, Orders, Pages, Portfolio, Products, Blog (search + pagination).
- No change to queries, styling, handlers, or empty-states. Summary totals (e.g. payments) are still computed over the full set, not the page.
- Out of scope: public pages (need SEO server-side paging) and server-side `.range()` paging (client-side is fine at current scale).

### Added — Global login on the main domain (#5)
- `/api/auth/login` is now **host-aware**. On a tenant subdomain or custom domain login stays **bound** to that tenant (`email + tenant_id`). On the **main domain** (`site9.in` / `www` / localhost) it does a **global** login: matches the account across all tenants, then the login page hands off to the owner's own subdomain (`https://{slug}.site9.in{dashboard}`) — the session cookie is scoped to `.site9.in` so it carries.
- Emails are not globally unique (one email can belong to 2–3 tenants): multiple matches return the existing **workspace picker**; `/api/auth/select-workspace` re-verifies and returns the slug for the same hand-off.
- Superadmin hardcoded `ADMIN_EMAIL`/`ADMIN_PASSWORD` account is unchanged and checked first; middleware still enforces tenant isolation on protected routes.

### Added — Blog (per-tenant, all admins)
- `blog_posts` table (tenant-scoped): title, slug, excerpt, TipTap `content_html` + `content_json`, cover image, author, tags, draft/published, and full SEO fields (`meta_title`, `meta_description`, `og_image_url`, `canonical_url`, `noindex`, `published_at`). RLS disabled + grants per project convention (`016_blog.sql`). Behind `FEATURES.blog` (on for all tenants).
- Admin **Blog** (`/admin/blog`): list, create, edit, delete. TipTap rich-text editor (`blog-editor.tsx`) with headings/lists/links/formatting, cover-image upload (reuses `/api/build/upload`), tags, and a collapsible SEO panel.
- **Super-admin oversight** (`/superadmin/blog`): cross-tenant list with publish/unpublish + delete moderation.
- Public **blog** (`/blog`, `/blog/[slug]`): tenant-scoped index + post pages with `generateMetadata` (canonical/OpenGraph, `noindex` support) and **BlogPosting JSON-LD** (`buildArticleJsonLd` in `lib/seo.ts`). Posts added to `sitemap.ts`; "Blog" link in the public header.
- API: `GET/POST /api/admin/blog`, `GET/PATCH/DELETE /api/admin/blog/[id]`, `GET /api/superadmin/blog`, `PATCH/DELETE /api/superadmin/blog/[id]`.

### Added — Razorpay billing management (manage / cancel / change plan / invoices / receipts)
- Tenant **Billing** page (`/admin/billing`): current plan, status, renewal/expiry date, **change plan**, **cancel** (at period end), and **invoice/receipt history**.
- New `subscription_invoices` table + `cancel_at_period_end` / `cancelled_at` columns on `subscriptions` (`015_subscription_invoices.sql`).
- API: `POST /api/billing/cancel`, `POST /api/billing/change-plan`, `GET /api/billing/invoices`. `GET /api/billing/status` now returns `cancelAtPeriodEnd`.
- **Hardened webhook**: records each `subscription.charged` / `invoice.paid` as an invoice (idempotent on `razorpay_invoice_id`) and sends a **receipt email**; sends a **payment-failed email** on `halted`/failed. New `lib/email/billing.ts`; reusable `useRazorpayCheckout` hook.

### Added — Subscriptions / Razorpay billing (#4)
- `subscriptions` table (one row per tenant): plan, Razorpay subscription/plan/customer ids, status, `current_end`. RLS disabled + grants per project convention (`013_subscriptions.sql`).
- **Soft upsell** — publishing is never blocked. Unsubscribed tenants see an `UpgradeBanner` in the builder ("Unlock your site's full potential"); it disappears once a subscription is active.
- Plans: **Monthly ₹29** and **Annual ₹108** (₹9/month). Created via `pnpm exec tsx src/scripts/razorpay-setup.ts`.
- API: `POST /api/billing/subscribe` (creates Razorpay subscription + returns Checkout params), `POST /api/billing/verify` (verifies the Checkout signature, activates), `POST /api/billing/webhook` (subscription lifecycle → status), `GET /api/billing/status`.
- Browser uses the Razorpay Checkout widget (loaded on demand). **No Razorpay keys?** `subscribe` unlocks inline (dev fallback) so the flow stays demoable.
- `lib/razorpay.ts` (client, plan catalogue, signature verification) and `lib/subscription.ts` (entitlement check, upserts). Unit tests in `src/lib/subscription.test.ts` (`pnpm test`).

### Added — Bookings module
- `bookings` and `calendar_blocks` tables (tenant-scoped), RLS disabled + grants per project convention.
- Admin **Bookings** (`/admin/bookings`) with two tabs:
  - **Booking management** — list appointments filtered by status, create new bookings, confirm → complete → cancel transitions, delete.
  - **Block the calendar** — add/remove blocked time ranges (one-off or all-day) that mark you unavailable.
- Public **self-booking** page (`/book`): customers pick a service, date/time and duration and request an appointment (created as `pending`). `GET/POST /api/book` resolves the tenant by subdomain; POST **rejects (409)** any request that overlaps a calendar block or an existing live booking, and the form shows a soft conflict warning client-side.
- API: `GET/POST /api/admin/bookings`, `PATCH/DELETE /api/admin/bookings/[id]`, `GET/POST /api/admin/calendar-blocks`, `DELETE /api/admin/calendar-blocks/[id]` (admin-only).
- All-day calendar blocks are expanded to full-day timestamp ranges so overlap checks work.
- Gated by `FEATURES.bookings` (`src/lib/features.ts`, default on): sidebar link hidden + `/admin/bookings` and `/book` redirect when off.

### Added — E-commerce module (#2)
- `products`, `orders`, `order_items` tables (tenant-scoped) with stock tracking and a `decrement_product_stock` function.
- Admin **Products** (`/admin/products`): list, create, inline stock +/- , status, image URL, edit, delete.
- Admin **Orders** (`/admin/orders`): list + detail with status changes.
- Public **Storefront** (`/shop`, `/shop/[slug]`): product grid + detail, client-side cart (localStorage), cart page.
- Checkout (`POST /api/store/checkout`) reuses the Stripe pattern; the webhook marks orders paid and decrements stock. Falls back to inline completion when Stripe is not configured (dev).

### Added — Page Builder (#1)
- `custom_pages` table (tenant-scoped): raw HTML/CSS, draft/published, `is_homepage`.
- Admin **Pages** (`/admin/pages`): create from starter templates (landing / portfolio / coming-soon / blank), HTML+CSS editor with live preview, publish/unpublish, set-as-homepage, delete.
- Public render at `/p/[slug]`; a published `is_homepage` page overrides the public homepage.
- HTML/CSS sanitized at render time (`src/lib/sanitize-html.ts`).

### Changed
- E-commerce and Page Builder are **hidden by default** via `src/lib/features.ts` (`ecommerce`/`pageBuilder` flags). Sidebar links are hidden and routes (`/shop`, `/p/*`, `/admin/products`, `/admin/orders`, `/admin/pages`) redirect away. Flip a flag to `true` to re-enable — no code or data is removed.

### Notes
- DB migrations: `005_ecommerce.sql`, `006_custom_pages.sql` (applied; grants added, RLS left disabled to match existing tables).
- Generated Supabase types extended in `src/lib/supabase/types.ts`.
- Sidebar gains **Products**, **Orders**, **Pages** under the admin portal.
