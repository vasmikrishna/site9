import { createClient } from "@/lib/supabase/server"
import { subdomainHost, slugify } from "@/lib/onboarding"
import { isSubscriptionActive } from "@/lib/subscription"

/** Account plans and the number of sites each one allows. */
export type AccountPlan = "free" | "pro" | "business"
export const PLAN_SITE_LIMITS: Record<AccountPlan, number> = { free: 1, pro: 5, business: 20 }
export const PLAN_LABELS: Record<AccountPlan, string> = { free: "Free", pro: "Pro", business: "Business" }

/**
 * Account → sites model.
 *
 * A user account is identified by its email. An account owns many sites
 * (tenants) via `tenants.owner_user_id`. Because a few legacy rows may share an
 * email across the old per-tenant model, ownership is resolved against ALL user
 * rows carrying that email.
 */

export interface AccountSite {
  id: string
  name: string
  slug: string
  host: string
  custom_domain: string | null
  domain_verified: boolean
  onboarding_complete: boolean
  status: string
  logo_url: string | null
  primary_color: string
  updated_at: string
}

/**
 * The user rows for this account: their ids plus any legacy `tenant_id` links
 * (from the old per-tenant model — these map a user directly to a site even
 * when `tenants.owner_user_id` wasn't set).
 */
export async function getAccountUsers(email: string): Promise<{ ids: string[]; legacyTenantIds: string[] }> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from("users").select("id, email, tenant_id")
  const mine = (data ?? []).filter((u: { email?: string }) => (u.email ?? "").toLowerCase() === email.toLowerCase())
  return {
    ids: mine.map((u: { id: string }) => u.id),
    legacyTenantIds: mine.map((u: { tenant_id?: string | null }) => u.tenant_id).filter(Boolean) as string[],
  }
}

/** All user-row ids that belong to this account email. */
export async function getAccountUserIds(email: string): Promise<string[]> {
  return (await getAccountUsers(email)).ids
}

const SITE_COLS = "id, name, slug, custom_domain, domain_verified, onboarding_complete, status, logo_url, primary_color, updated_at"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSite(t: any): AccountSite {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    host: subdomainHost(t.slug),
    custom_domain: t.custom_domain ?? null,
    domain_verified: !!t.domain_verified,
    onboarding_complete: !!t.onboarding_complete,
    status: t.status,
    logo_url: t.logo_url ?? null,
    primary_color: t.primary_color ?? "#2B6BFF",
    updated_at: t.updated_at,
  }
}

/** The sites (tenants) this account owns, newest first. Self-heals legacy links. */
export async function getSitesForEmail(email: string): Promise<AccountSite[]> {
  const { ids, legacyTenantIds } = await getAccountUsers(email)
  if (ids.length === 0 && legacyTenantIds.length === 0) return []
  const supabase = createClient()

  const byId = new Map<string, AccountSite>()
  if (ids.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from("tenants").select(SITE_COLS).in("owner_user_id", ids)
    for (const t of data ?? []) byId.set(t.id, toSite(t))
  }
  if (legacyTenantIds.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from("tenants").select(`${SITE_COLS}, owner_user_id`).in("id", legacyTenantIds)
    const orphans: string[] = []
    for (const t of data ?? []) {
      byId.set(t.id, toSite(t))
      if (!t.owner_user_id && ids[0]) orphans.push(t.id)
    }
    // Backfill owner_user_id so the link is permanent.
    if (orphans.length && ids[0]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("tenants").update({ owner_user_id: ids[0] }).in("id", orphans)
    }
  }

  return [...byId.values()].sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
}

/** Does this account own the given site? */
export async function accountOwnsTenant(email: string, tenantId: string): Promise<boolean> {
  const { ids, legacyTenantIds } = await getAccountUsers(email)
  if (legacyTenantIds.includes(tenantId)) return true
  if (ids.length === 0) return false
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("tenants").select("id").eq("id", tenantId).in("owner_user_id", ids).maybeSingle()
  return !!data
}

/**
 * The account's plan. 'business' is a stored super-admin override; otherwise
 * an active subscription on any owned site upgrades the account to 'pro'.
 */
export async function getAccountPlan(email: string): Promise<AccountPlan> {
  const ids = await getAccountUserIds(email)
  if (ids.length === 0) return "free"
  const supabase = createClient()

  // Super-admin override stored on the account row.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: users } = await (supabase as any).from("users").select("plan").in("id", ids)
  if ((users ?? []).some((u: { plan?: string }) => u.plan === "business")) return "business"

  // Otherwise: any active site subscription ⇒ Pro.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tenants } = await (supabase as any).from("tenants").select("id").in("owner_user_id", ids)
  const tenantIds = (tenants ?? []).map((t: { id: string }) => t.id)
  if (tenantIds.length === 0) return "free"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subs } = await (supabase as any).from("subscriptions").select("*").in("tenant_id", tenantIds)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((subs ?? []).some((s: any) => isSubscriptionActive(s))) return "pro"
  return "free"
}

/** Plan + how many sites are used vs allowed, for the dashboard + quota gate. */
export async function getAccountQuota(email: string): Promise<{ plan: AccountPlan; used: number; limit: number }> {
  const [plan, sites] = await Promise.all([getAccountPlan(email), getSitesForEmail(email)])
  return { plan, used: sites.length, limit: PLAN_SITE_LIMITS[plan] }
}

/** Generate a subdomain slug that isn't already taken. */
async function uniqueSlug(name: string): Promise<string> {
  const supabase = createClient()
  const base = slugify(name) || "site"
  let slug = base
  let n = 1
  // Bounded loop — extremely unlikely to iterate more than a couple times.
  for (let i = 0; i < 50; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from("tenants").select("id").eq("slug", slug).maybeSingle()
    if (!data) return slug
    n += 1
    slug = `${base}-${n}`.slice(0, 40).replace(/-+$/g, "")
  }
  return `${base}-${Date.now().toString(36)}`.slice(0, 40)
}

/**
 * Create a new site owned by this account. Returns the new tenant's id/slug/host,
 * or null if the account couldn't be resolved.
 */
export async function createSiteForEmail(
  email: string,
  name: string,
): Promise<{ tenantId: string; slug: string; host: string } | null> {
  const ids = await getAccountUserIds(email)
  const ownerId = ids[0]
  if (!ownerId) return null

  const supabase = createClient()
  const slug = await uniqueSlug(name)
  const now = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tenant, error } = await (supabase as any)
    .from("tenants")
    .insert({
      name,
      slug,
      industry: "general",
      plan: "free",
      status: "active",
      primary_color: "#2B6BFF",
      settings: { business: { name } },
      onboarding_complete: false,
      owner_user_id: ownerId,
      created_at: now,
      updated_at: now,
    })
    .select("id, slug")
    .single()

  if (error || !tenant) {
    console.error("[sites] create failed:", error?.message)
    return null
  }
  return { tenantId: tenant.id, slug: tenant.slug, host: subdomainHost(tenant.slug) }
}
