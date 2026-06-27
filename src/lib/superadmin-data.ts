import { createClient } from "@/lib/supabase/server"

// Super-admin platform data. We query each table separately and stitch in JS
// instead of using PostgREST embeds: since migration 020 added
// tenants.owner_user_id → users(id) ALONGSIDE the original users.tenant_id →
// tenants(id), a `tenants?select=*,users(id)` embed is ambiguous and PostgREST
// errors out (which silently returned 0 rows — the "0 tenants" bug).

export interface SAUser {
  id: string
  email: string
  name: string | null
  plan: string
  created_at: string | null
  siteCount: number
  totalPaidPaise: number
}

export interface SATenant {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any
  id: string
  name: string
  slug: string
  status: string
  plan: string
  ownerEmail: string | null
  ownerName: string | null
  subStatus: string | null
  subPlan: string | null
  paidPaise: number
}

export interface SAPayment {
  id: string
  tenantId: string | null
  tenantName: string
  ownerEmail: string | null
  amount: number // paise
  currency: string
  status: string
  plan: string | null
  paidAt: string | null
  invoiceUrl: string | null
}

export interface PlatformData {
  users: SAUser[]
  tenants: SATenant[]
  payments: SAPayment[]
  totals: {
    tenants: number
    users: number
    activeSubs: number
    revenuePaise: number
  }
}

export async function getPlatformData(): Promise<PlatformData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createClient() as any

  const [tenantsRes, usersRes, subsRes, invoicesRes] = await Promise.all([
    sb.from("tenants").select("*").order("created_at", { ascending: false }),
    sb.from("users").select("id,email,name,plan,created_at,tenant_id").order("created_at", { ascending: false }),
    sb.from("subscriptions").select("tenant_id,plan,status,current_end"),
    sb
      .from("subscription_invoices")
      .select("id,tenant_id,subscription_id,amount,currency,status,paid_at,invoice_url,created_at")
      .order("paid_at", { ascending: false, nullsFirst: false }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawTenants: any[] = tenantsRes.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawUsers: any[] = usersRes.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subs: any[] = subsRes.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoices: any[] = invoicesRes.data ?? []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userById = new Map<string, any>(rawUsers.map((u) => [u.id, u]))
  // Legacy fallback: a tenant whose owner_user_id is null can still be matched
  // to the account via the old users.tenant_id link.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userByTenantId = new Map<string, any>()
  for (const u of rawUsers) {
    if (u.tenant_id && !userByTenantId.has(u.tenant_id)) userByTenantId.set(u.tenant_id, u)
  }

  const subByTenant = new Map<string, { plan: string; status: string; current_end: string | null }>()
  for (const s of subs) subByTenant.set(s.tenant_id, s)

  // Paid total per tenant (only successful charges count toward revenue).
  const paidByTenant = new Map<string, number>()
  for (const inv of invoices) {
    if (inv.status !== "paid") continue
    paidByTenant.set(inv.tenant_id, (paidByTenant.get(inv.tenant_id) ?? 0) + (inv.amount ?? 0))
  }

  // Resolve each tenant's owning account.
  const ownerOf = (t: { id: string; owner_user_id?: string | null }) =>
    (t.owner_user_id ? userById.get(t.owner_user_id) : null) ?? userByTenantId.get(t.id) ?? null

  const tenants: SATenant[] = rawTenants.map((t) => {
    const owner = ownerOf(t)
    const sub = subByTenant.get(t.id) ?? null
    return {
      ...t,
      ownerEmail: owner?.email ?? null,
      ownerName: owner?.name ?? null,
      subStatus: sub?.status ?? null,
      subPlan: sub?.plan ?? null,
      paidPaise: paidByTenant.get(t.id) ?? 0,
    }
  })

  // Aggregate per user: how many sites they own + total paid across them.
  const siteCount = new Map<string, number>()
  const paidByUser = new Map<string, number>()
  for (const t of rawTenants) {
    const owner = ownerOf(t)
    if (!owner) continue
    siteCount.set(owner.id, (siteCount.get(owner.id) ?? 0) + 1)
    paidByUser.set(owner.id, (paidByUser.get(owner.id) ?? 0) + (paidByTenant.get(t.id) ?? 0))
  }

  const users: SAUser[] = rawUsers.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name ?? null,
    plan: u.plan ?? "free",
    created_at: u.created_at ?? null,
    siteCount: siteCount.get(u.id) ?? 0,
    totalPaidPaise: paidByUser.get(u.id) ?? 0,
  }))

  const tenantById = new Map(rawTenants.map((t) => [t.id, t]))
  const payments: SAPayment[] = invoices.map((inv) => {
    const t = inv.tenant_id ? tenantById.get(inv.tenant_id) : null
    const owner = t ? ownerOf(t) : null
    return {
      id: inv.id,
      tenantId: inv.tenant_id ?? null,
      tenantName: t?.name ?? "—",
      ownerEmail: owner?.email ?? null,
      amount: inv.amount ?? 0,
      currency: inv.currency ?? "INR",
      status: inv.status ?? "paid",
      plan: subByTenant.get(inv.tenant_id)?.plan ?? null,
      paidAt: inv.paid_at ?? inv.created_at ?? null,
      invoiceUrl: inv.invoice_url ?? null,
    }
  })

  const revenuePaise = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + (i.amount ?? 0), 0)
  const activeSubs = subs.filter((s) => s.status === "active" || s.status === "authenticated").length

  return {
    users,
    tenants,
    payments,
    totals: {
      tenants: rawTenants.length,
      users: rawUsers.length,
      activeSubs,
      revenuePaise,
    },
  }
}

/** Format paise (₹1 = 100) as a localized ₹ string. */
export function formatPaise(paise: number, currency = "INR"): string {
  const amount = (paise ?? 0) / 100
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `₹${amount.toLocaleString("en-IN")}`
  }
}
