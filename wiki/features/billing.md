# Billing — Razorpay subscriptions

Recurring subscriptions that gate a **soft upsell** in the website builder.
Publishing is **never blocked**; an active subscription only hides the upgrade
prompt and unlocks "full potential" perks (branding removal, custom domain, etc.).

## Plans
Two paid tiers (Pro, Max), each in **monthly** and **yearly** cadence (yearly =
2 months free). Plus a Free tier (1 website).

| Plan | Monthly | Yearly | Websites |
|------|---------|--------|----------|
| Free | ₹0 | — | 1 |
| Pro | ~~₹199~~ ₹99/mo | ~~₹1,188~~ ₹990/yr | up to 5 |
| Max | ~~₹499~~ ₹299/mo | ~~₹3,588~~ ₹2,990/yr | up to 20 |

Plan keys are composite `tier_period`: `pro_monthly`, `pro_yearly`,
`max_monthly`, `max_yearly`. Env (live plan IDs):
`RAZORPAY_PLAN_PRO_ID` `plan_T7OjeP1wqzwJP1`, `RAZORPAY_PLAN_PRO_YEARLY_ID`
`plan_T7QQZBPvJNMGA8`, `RAZORPAY_PLAN_MAX_ID` `plan_T7Ptw7aBZD5M0g`,
`RAZORPAY_PLAN_MAX_YEARLY_ID` `plan_T7QQZP7xc9PY7E`.
**Website-count limits are display-only — not yet enforced** (no account-level site cap wired).

## Data model
- **subscriptions** (one row per tenant) — `tenant_id (unique)`, `plan (pro_monthly|pro_yearly|max_monthly|max_yearly)`, `status`, `razorpay_subscription_id`, `razorpay_plan_id`, `razorpay_customer_id`, `short_url`, `current_end`, timestamps.
- **Entitlement** (`isSubscriptionActive`): status in `active`/`authenticated` **and** `current_end` (if set) is in the future.

## Surfaces
| Area | Path |
|------|------|
| Upsell banner | `src/components/build/upgrade-banner.tsx` (rendered in the builder) |
| **Manage subscription** | `/admin/billing` — plan, status, renewal, change-plan, cancel, invoices (`billing-client.tsx`) |
| Start subscription | `POST /api/billing/subscribe` |
| Verify after Checkout | `POST /api/billing/verify` |
| Change plan | `POST /api/billing/change-plan` (cancels current, starts new) |
| Cancel | `POST /api/billing/cancel` (at period end) |
| Invoice history | `GET /api/billing/invoices` |
| Lifecycle webhook | `POST /api/billing/webhook` (records charges → `subscription_invoices`, sends receipt/failed emails) |
| Status | `GET /api/billing/status` (incl. `cancelAtPeriodEnd`) |
| Super-admin payments | `/superadmin/payments` — lists recorded invoices **and** subscription attempts that never produced an invoice (`created`/`halted`→failed), so initiated/failed charges are visible (`src/lib/superadmin-data.ts`) |
| Reusable Checkout hook | `src/hooks/use-razorpay-checkout.ts` |
| Receipt / dunning emails | `src/lib/email/billing.ts` |
| Razorpay client/plans/signatures | `src/lib/razorpay.ts` |
| Entitlement + invoices + upserts | `src/lib/subscription.ts` |
| Plan setup (run once) | `src/scripts/razorpay-setup.ts` |

## Flow
1. Unsubscribed tenant opens `/build` → sees the **UpgradeBanner**.
2. Clicks **Subscribe** → picks Monthly or Annual.
3. `POST /api/billing/subscribe` creates a Razorpay subscription, stores a
   `created` row, and returns `{ subscriptionId, keyId, ... }`.
4. Browser opens **Razorpay Checkout**; on success its `handler` calls
   `POST /api/billing/verify`, which checks the signature and flips the row to
   `active`. The banner disappears.
5. `POST /api/billing/webhook` keeps status in sync over time
   (`activated`/`charged`/`halted`/`cancelled`/`completed`). **Source of truth.**
6. **No Razorpay keys (dev)?** `subscribe` activates inline and skips Checkout.

## Setup
1. Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` to `.env.local`.
2. `set -a && source .env.local && set +a && pnpm exec tsx src/scripts/razorpay-setup.ts`
3. Paste the printed `RAZORPAY_PLAN_MONTHLY_ID` / `RAZORPAY_PLAN_ANNUAL_ID` into `.env.local`.
4. In the Razorpay dashboard, add a webhook → `/api/billing/webhook` with the
   `subscription.*` events and the same `RAZORPAY_WEBHOOK_SECRET`.

## Notes / future
- Apply migrations `013_subscriptions.sql` **and** `015_subscription_invoices.sql` (grants added, RLS left disabled to match existing tables).
- In the Razorpay dashboard webhook, also enable `subscription.charged` / `invoice.paid` (for invoice records + receipts) and `subscription.halted` (dunning email).
- Coexists with the existing **Stripe** flows (project/store payments) — Razorpay is for INR subscriptions.
- To make it a **hard gate** later, check `isSubscriptionActive` in `POST /api/build/publish`.
- **Now built:** manage page (`/admin/billing`), cancel (at period end), change plan, invoice/receipt history, receipt + payment-failed emails.
- Still future: proration on plan change (currently cancel-and-restart), the perks the subscription unlocks (badge removal wiring).
