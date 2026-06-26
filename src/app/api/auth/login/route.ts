import { NextResponse } from "next/server"
import { createSession } from "@/lib/session"
import { getTenantSlug, getTenantBySlug } from "@/lib/tenant"
import { getSitesForEmail } from "@/lib/sites"
export const dynamic = "force-dynamic"

/**
 * POST /api/auth/login
 *
 * Two account types only:
 *  1. Super-admin — env ADMIN_EMAIL / ADMIN_PASSWORD. Sees everything (/superadmin).
 *  2. Regular user — a global account (identified by email) that owns many sites.
 *
 * Login is global (main domain). Subdomains never show this form — middleware
 * redirects their /login to the apex.
 */
export async function POST(req: Request) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 })
  }

  // ── Super-admin (env-based) ───────────────────────────────────────────────
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
  if (ADMIN_EMAIL && ADMIN_PASSWORD && email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const slug = await getTenantSlug()
    const tenant = await getTenantBySlug(slug)
    await createSession({ id: "admin", email, name: "Admin", role: "admin", tenant_id: tenant?.id ?? "" })
    return NextResponse.json({ ok: true, superadmin: true })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl?.startsWith("http") || !supabaseKey) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  const { createClient } = await import("@supabase/supabase-js")
  const supabase = createClient(supabaseUrl, supabaseKey)
  const bcrypt = await import("bcryptjs")

  // ── Regular user — global lookup by email ────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase as any)
    .from("users")
    .select("id, email, name, password_hash")
    .ilike("email", email)

  let account: { id: string; email: string; name: string } | null = null
  for (const u of rows ?? []) {
    if (u.password_hash && (await bcrypt.compare(password, u.password_hash))) {
      account = { id: u.id, email: u.email, name: u.name }
      break
    }
  }
  if (!account) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
  }

  // Active site = the account's most-recently-updated site (or none yet).
  const sites = await getSitesForEmail(account.email)
  const activeTenantId = sites[0]?.id ?? ""

  await createSession({
    id: account.id,
    email: account.email,
    name: account.name,
    role: "admin",
    tenant_id: activeTenantId,
  })

  return NextResponse.json({ ok: true, hasSites: sites.length > 0 })
}
