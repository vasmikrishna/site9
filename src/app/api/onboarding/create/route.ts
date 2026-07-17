import { NextResponse } from "next/server"
import { createSession, getSession } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"
import { slugify, validateSlug } from "@/lib/onboarding"
import { getAccountUsers, getAccountQuota, PLAN_LABELS } from "@/lib/sites"
export const dynamic = "force-dynamic"

/**
 * POST /api/onboarding/create
 * Claims a subdomain and creates the owner account in one step:
 *   1. validate + re-check the slug is free (guards against races)
 *   2. create the tenant (onboarding_complete = false → portal stays locked)
 *   3. create the owner user, scoped to that tenant
 *   4. start a session so they can continue into the /build flow
 *
 * Ownership across the platform is resolved by email (see lib/sites), so an
 * email that already has an account may only claim a subdomain when the caller
 * proves they hold it — i.e. they are signed in as that account. Otherwise
 * anyone could enter someone else's email here, pick their own password, and
 * inherit every site on that email.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const businessName = String(body.businessName ?? "").trim()
  const slug = slugify(String(body.slug ?? ""))
  const name = String(body.name ?? "").trim()
  const email = String(body.email ?? "").trim().toLowerCase()
  const password = String(body.password ?? "")
  // Issue #11: mobile is a required contact field for the business. Stored on
  // the owner user (users.phone) and the tenant (tenants.contact_phone).
  const phone = String(body.phone ?? "").trim()

  if (!businessName) return NextResponse.json({ error: "Business name is required" }, { status: 400 })
  if (!name || !email || !password) return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 })
  if (!phone) return NextResponse.json({ error: "Mobile number is required" }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })

  const format = validateSlug(slug)
  if (!format.valid) return NextResponse.json({ error: `Subdomain: ${format.reason}` }, { status: 400 })

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") || !(process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  const supabase = createClient()

  // Does this email already have an account? If so the caller must be signed in
  // as it — otherwise this endpoint would hand a stranger every site on that
  // email. Signed-in owners skip the new-user insert and just get another site.
  const { ids: existingIds } = await getAccountUsers(email)
  let ownerId: string | null = null
  if (existingIds.length > 0) {
    const session = await getSession()
    if ((session?.email ?? "").trim().toLowerCase() !== email) {
      return NextResponse.json(
        { error: "An account with this email already exists — sign in to add another site.", field: "email" },
        { status: 409 },
      )
    }
    ownerId = existingIds[0]

    // Existing owners add sites through this route now, so it has to respect the
    // same plan quota /api/sites enforces — otherwise /start is a way around it.
    const quota = await getAccountQuota(email)
    if (quota.used >= quota.limit) {
      return NextResponse.json({
        error: `Your ${PLAN_LABELS[quota.plan]} plan allows ${quota.limit} site${quota.limit === 1 ? "" : "s"}. Upgrade to add more.`,
        upgrade: true,
      }, { status: 402 })
    }
  }

  // Re-check availability just before insert.
  const { data: taken } = await (supabase as any).from("tenants").select("id").eq("slug", slug).maybeSingle()
  if (taken) return NextResponse.json({ error: "That subdomain was just taken — try another" }, { status: 409 })

  // Create the tenant.
  const { data: tenant, error: tErr } = await (supabase as any)
    .from("tenants")
    .insert({
      name: businessName,
      slug,
      industry: "general",
      plan: "starter",
      status: "active",
      onboarding_complete: false,
      contact_email: email,
      contact_phone: phone,
      owner_user_id: ownerId,
      settings: { business: { name: businessName } },
    })
    .select("id")
    .single()

  if (tErr || !tenant) {
    // 23505 = unique violation on slug (race we lost).
    const conflict = tErr?.code === "23505"
    return NextResponse.json(
      { error: conflict ? "That subdomain was just taken — try another" : "Could not create your site" },
      { status: conflict ? 409 : 500 },
    )
  }

  // Existing owner (already proven above): the tenant is theirs, so just point
  // the session at it. No second user row — duplicate rows per email are what
  // made ownership ambiguous in the first place.
  if (ownerId) {
    const session = (await getSession())!
    await createSession({ ...session, id: ownerId, tenant_id: tenant.id })
    return NextResponse.json({ ok: true, slug, tenantId: tenant.id })
  }

  // Create the owner user, scoped to the new tenant. The person who claims a
  // subdomain owns that tenant, so they get the "admin" role (full portal),
  // not "client". (Platform super-admin is separate — see auth/login.)
  try {
    const bcrypt = await import("bcryptjs")
    const password_hash = await bcrypt.hash(password, 12)
    const { data: user, error: uErr } = await (supabase as any)
      .from("users")
      .insert({ name, email, phone, password_hash, role: "admin", tenant_id: tenant.id, status: "active" })
      .select("id, email, name, role, tenant_id")
      .single()

    if (uErr || !user) {
      // Roll back the orphaned tenant so the slug frees up again.
      await (supabase as any).from("tenants").delete().eq("id", tenant.id)
      return NextResponse.json({ error: "Could not create your account" }, { status: 500 })
    }

    // Record ownership on the tenant itself, so it never relies on the legacy
    // email backfill in lib/sites to find its way home.
    await (supabase as any).from("tenants").update({ owner_user_id: user.id }).eq("id", tenant.id)

    await createSession({ id: user.id, email: user.email, name: user.name, role: "admin", tenant_id: tenant.id })
    return NextResponse.json({ ok: true, slug, tenantId: tenant.id })
  } catch {
    await (supabase as any).from("tenants").delete().eq("id", tenant.id)
    return NextResponse.json({ error: "Could not create your account" }, { status: 500 })
  }
}
