# SEO & Discoverability

How Site9 makes its pages findable by search engines. Scope today is the **platform / apex (`site9.in`)**; per-tenant SEO automation is parked until ~1k users (#5).

## Search-console verification
- **Google Search Console:** use a **Domain property** verified with one DNS TXT record on `site9.in` — this covers the apex *and every* `*.site9.in` *subdomain* at once.
- **Fallback meta tags:** set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` / `NEXT_PUBLIC_BING_SITE_VERIFICATION`; emitted via the `verification` field in `src/app/layout.tsx`.
- **Bing Webmaster Tools:** import directly from GSC (no separate verification needed).

## Sitemap — `src/app/sitemap.ts`
Tenant-aware, generated per request via `getCanonicalOrigin`. Lists home/about/services/contact, `/templates` (apex only), the blog index, **all published blog posts**, and **published custom pages**. The apex is *not* a special case — its own content (incl. the daily content engine, which writes to the `site9` tenant) is included.

## Robots — `src/app/robots.ts`
Allows `/`, disallows `/admin/`, `/superadmin/`, `/api/`, `/login`, `/register`, etc. Points at `/sitemap.xml`.

## IndexNow — `src/lib/indexnow.ts` + `/api/indexnow-key`
Instant-recrawl pings to Bing/Yandex on publish. `submitToIndexNow(urls)` groups URLs per host and is best-effort (never blocks a publish). Requires env `INDEXNOW_KEY` (hex, 8–128 chars), served at `/api/indexnow-key` and referenced as `keyLocation`. Wired into `POST /api/admin/blog` and `PATCH /api/admin/blog/[id]` (when status is `published`).

## Structured data (JSON-LD) — `src/lib/seo.ts`
- `WebSite` + `Organization` — apex public layout.
- `LocalBusiness` — tenant public layout.
- `BlogPosting` + `BreadcrumbList` — blog post pages.

## Feeds & social cards
- **RSS 2.0** at `/blog/feed.xml` (tenant-aware, latest 50 published) + `<link rel="alternate">` on the blog index.
- **OG images** via `next/og` `ImageResponse`: per-post and a branded site default, tinted with the tenant primary colour.

## Related
- Daily AI content engine — see `content-engine.md` (Phase 2).
- Blog architecture — see `blog.md`.
