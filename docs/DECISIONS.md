# Architecture Decision Records

## ADR-003 — Social media: native Meta Graph API behind a provider adapter, mock-first; paid aggregators rejected (2026-06-25)

**Context.** We need Instagram + Facebook publishing for tenant admin portals. The options were:
1. **Paid aggregator SaaS** (Ayrshare, Postiz cloud) — one HTTP API, handles OAuth + token refresh, but costs $30–$100+/month per workspace.
2. **Native Meta Graph API** — free, direct, requires a verified Facebook App and Meta App Review to unlock `instagram_content_publish` + `pages_manage_posts`.
3. **Self-hosted open-source scheduler** (Postiz self-hosted, Cal.com-style) — zero recurring cost, but adds a separate service to the infra.

**Decision.**
- **Use the native Meta Graph API** ($0 recurring cost). The investment is one-time: create a Meta App, complete App Review. Not appropriate for a paid third-party service when the API is free and publicly documented.
- **Wrap it in a provider adapter** (`src/lib/social/provider.ts`). `getProvider(platform)` returns `MockProvider` when `SOCIAL_MOCK=1` or `META_APP_ID` is absent, and `MetaProvider` otherwise. This means the full feature works end-to-end with no Meta credentials during development and demos.
- **Build mock-first, defer real OAuth.** Real Meta OAuth and Graph API calls live in `src/lib/social/meta.ts` but are gated behind the provider flag. The user supplies a Facebook App when ready; no code changes needed, just env vars.
- **Reject paid aggregators.** Ayrshare and Postiz cloud would add $30–$100/month per tenant at scale. The extensibility trade-off is also better here: adding X/Twitter, LinkedIn, or YouTube means implementing another provider, not being dependent on a vendor's platform support.

**Why not self-hosted Postiz?** It adds a separate Docker service (Postgres, Redis, workers) to maintain alongside the Next.js + Supabase stack. The native approach keeps the architecture simple and uses Supabase for state.

**Consequences.**
- Four new tables: `social_accounts`, `social_posts`, `social_post_targets`, `social_settings` — all RLS-disabled + grants per project convention (`019_social.sql`).
- Account tokens encrypted at rest with AES-256-GCM (`SOCIAL_TOKEN_ENC_KEY`). Key rotation requires a migration of stored token blobs.
- AI content drafting uses Tavily (search) + DeepSeek/Gemini (drafting) — see `src/lib/social/discover.ts`. Requires `TAVILY_API_KEY` and one LLM key. Can be replaced without touching the provider layer.
- Until Meta App Review is approved, the feature runs entirely on `MockProvider`. All admin UI, scheduling, cron, and AI drafting work in mock mode.
- Adding new platforms (X/Twitter, LinkedIn, YouTube): implement a new `SocialProvider` in `src/lib/social/` and register it in `getProvider`. UI "Coming soon" chips for those three are already present.

## ADR-002 — Customer accounts as cross-tenant identity by email, not a memberships table (2026-06-24, #7)

**Context.** We want one person to sign up as a **customer** on any tenant's
public site, span multiple tenants, optionally own their own, and see everything
from one place. The app already keys identity by `(email, tenant_id)` — the same
email gets one user row per tenant, and "workspaces" are discovered by matching
the email (with a sidebar switcher + login picker already built).

**Decision.**
- **Build on the existing model** — no canonical-user / memberships-table
  refactor. Role lives per user row, so a person is already `admin` of one tenant
  and `client` of another. A shared `getWorkspacesForEmail()` is the single source
  for "which businesses do I belong to."
- **The hub (`/account`) lives outside the tenant-isolated route groups.** It is
  not in `middleware.ts`'s `isProtected` set, so the session is never cleared
  there; the page enforces auth itself. "Enter" uses `switch-workspace` then a
  full navigation to the target subdomain (cookie is `.site9.in`-scoped).
- **Customer data is read server-side (service role), filtered by user identity
  AND current `tenant_id`** — never cross-tenant. Orders use `customer_id`,
  bookings use email (+ new `customer_id` for new ones).

**Why not a memberships table?** It's the cleaner long-term model (central
identity, invites, one row per person) but a large, risky refactor of custom JWT
auth (login/register/google/middleware/switch) for no user-visible gain here. The
email-keyed model already delivers the multi-tenant account; revisit if we need
invitations or central user management. Trade-off: emails aren't globally unique,
and workspace discovery is an email scan rather than a join.

## ADR-001 — Razorpay subscriptions as a soft upsell (2026-06-23, #4)

**Context.** We want recurring revenue and to nudge tenants toward paying, but
blocking publishing for unpaid tenants kills activation for a self-serve builder.

**Decision.**
- Use **Razorpay Subscriptions** (recurring) — Monthly ₹29 and Annual ₹108 (₹9/mo).
- **Soft gate:** publishing is always allowed. An unpaid tenant sees an
  `UpgradeBanner` in the builder; an active subscription hides it. Entitlement is
  derived from a per-tenant `subscriptions` row, not from `tenants.plan`.
- **Webhook is the source of truth** for subscription status; the post-Checkout
  `verify` call only gives the user an instant unlock.
- **Dev fallback:** with no `RAZORPAY_*` env, `subscribe` activates inline so the
  flow is demoable locally — mirrors the existing Stripe checkout convention.

**Why not Stripe (already in the repo)?** Stripe powers project/store payments,
but the audience is India-first; Razorpay is the better fit for INR subscriptions
and UPI mandates. The two coexist.

**Consequences.**
- New `subscriptions` table (RLS disabled + grants, per project convention).
- Razorpay Checkout JS is loaded on demand in the browser.
- Future work can flip to a hard gate by checking `isSubscriptionActive` in
  `/api/build/publish`; the entitlement helper already exists.
