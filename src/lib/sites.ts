import { createClient } from "@/lib/supabase/server"
import { subdomainHost, slugify } from "@/lib/onboarding"

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

/** All user-row ids that belong to this account email. */
export async function getAccountUserIds(email: string): Promise<string[]> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from("users").select("id, email")
  return (data ?? [])
    .filter((u: { email?: string }) => (u.email ?? "").toLowerCase() === email.toLowerCase())
    .map((u: { id: string }) => u.id)
}

/** The sites (tenants) this account owns, newest first. */
export async function getSitesForEmail(email: string): Promise<AccountSite[]> {
  const ids = await getAccountUserIds(email)
  if (ids.length === 0) return []
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("tenants")
    .select("id, name, slug, custom_domain, domain_verified, onboarding_complete, status, logo_url, primary_color, updated_at")
    .in("owner_user_id", ids)
    .order("updated_at", { ascending: false })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((t: any) => ({
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
  }))
}

/** Does this account own the given site? */
export async function accountOwnsTenant(email: string, tenantId: string): Promise<boolean> {
  const ids = await getAccountUserIds(email)
  if (ids.length === 0) return false
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .in("owner_user_id", ids)
    .maybeSingle()
  return !!data
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
