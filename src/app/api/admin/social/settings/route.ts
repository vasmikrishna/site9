import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"
import { getCurrentTenant } from "@/lib/tenant"
import type { SocialSettings } from "@/types"

const supabaseConfigured = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const DEFAULT_SETTINGS: Omit<SocialSettings, "tenant_id" | "created_at" | "updated_at"> = {
  auto_generate: false,
  keywords: [],
  niche: null,
  tone: null,
  post_count_per_run: 1,
  autopublish: false,
  last_run_at: null,
}

// GET /api/admin/social/settings
// Returns the tenant's social_settings, inserting defaults if missing.
export async function GET() {
  const session = await getSession()
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!supabaseConfigured()) {
    return NextResponse.json({ settings: null })
  }

  const supabase = createClient()
  const tenant = await getCurrentTenant().catch(() => null)
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
  }

  let { data: settings } = await supabase
    .from("social_settings")
    .select("*")
    .eq("tenant_id", tenant.id)
    .maybeSingle()

  if (!settings) {
    const { data: inserted, error: insertErr } = await supabase
      .from("social_settings")
      .insert({ tenant_id: tenant.id, ...DEFAULT_SETTINGS } as never)
      .select()
      .single()

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
    settings = inserted
  }

  return NextResponse.json({ settings })
}

// PUT /api/admin/social/settings
// Body: partial SocialSettings fields (tenant_id is inferred).
export async function PUT(req: Request) {
  const session = await getSession()
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!supabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  const supabase = createClient()
  const tenant = await getCurrentTenant().catch(() => null)
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
  }

  // Build update: pick known fields from body, inject tenant_id
  const allowedKeys: (keyof Omit<SocialSettings, "tenant_id" | "created_at" | "updated_at">)[] = [
    "auto_generate",
    "keywords",
    "niche",
    "tone",
    "post_count_per_run",
    "autopublish",
    "last_run_at",
  ]

  const update: Record<string, unknown> = { tenant_id: tenant.id }
  for (const key of allowedKeys) {
    if (key in body) update[key] = body[key]
  }

  const { data: settings, error } = await supabase
    .from("social_settings")
    .upsert(update as never, { onConflict: "tenant_id" })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ settings })
}
