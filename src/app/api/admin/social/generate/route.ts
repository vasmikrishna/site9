import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"
import { getCurrentTenant } from "@/lib/tenant"
import { discoverAndDraft } from "@/lib/social/discover"
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

// POST /api/admin/social/generate
// Discovers a trend and drafts an AI post for the tenant.
// Returns the inserted social_post row.
export async function POST() {
  const session = await getSession()
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!supabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  const supabase = createClient()
  const tenant = await getCurrentTenant().catch(() => null)
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
  }

  // Load or create social_settings
  let { data: settings } = await supabase
    .from("social_settings")
    .select("*")
    .eq("tenant_id", tenant.id)
    .maybeSingle()

  if (!settings) {
    const { data: inserted } = await supabase
      .from("social_settings")
      .insert({ tenant_id: tenant.id, ...DEFAULT_SETTINGS } as never)
      .select()
      .single()
    settings = inserted
  }

  if (!settings) {
    return NextResponse.json({ error: "Could not load or create social settings" }, { status: 500 })
  }

  try {
    const draft = await discoverAndDraft(
      { id: tenant.id, name: tenant.name },
      settings as unknown as SocialSettings,
    )

    const { data: post, error: insertErr } = await supabase
      .from("social_posts")
      .insert({ ...draft, status: "ready", source: "ai" } as never)
      .select()
      .single()

    if (insertErr || !post) {
      return NextResponse.json({ error: insertErr?.message ?? "Insert failed" }, { status: 500 })
    }

    return NextResponse.json({ post }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
