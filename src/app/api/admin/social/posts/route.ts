import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"
import { getCurrentTenant } from "@/lib/tenant"
import { createTargets, publishPost } from "@/lib/social/publish"

const supabaseConfigured = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// GET /api/admin/social/posts?status=
// Returns posts with their targets joined.
export async function GET(req: Request) {
  const session = await getSession()
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!supabaseConfigured()) {
    return NextResponse.json({ posts: [] })
  }

  const supabase = createClient()
  const tenant = await getCurrentTenant().catch(() => null)
  const { searchParams } = new URL(req.url)
  const statusFilter = searchParams.get("status")

  let query = supabase
    .from("social_posts")
    .select("*, social_post_targets(*)")
    .order("created_at", { ascending: false })

  if (tenant?.id) query = query.eq("tenant_id", tenant.id)
  if (statusFilter) query = query.eq("status", statusFilter as never)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ posts: data ?? [] })
}

// POST /api/admin/social/posts
// Body: { caption, hashtags?, media_urls?, target_account_ids, scheduled_at?, action }
export async function POST(req: Request) {
  const session = await getSession()
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))

  const caption = typeof body.caption === "string" ? body.caption.trim() : ""
  if (!caption) {
    return NextResponse.json({ error: "caption is required" }, { status: 400 })
  }

  const hashtags: string[] = Array.isArray(body.hashtags) ? body.hashtags : []
  const media_urls: string[] = Array.isArray(body.media_urls) ? body.media_urls : []
  const target_account_ids: string[] = Array.isArray(body.target_account_ids)
    ? body.target_account_ids
    : []
  const scheduled_at: string | null =
    typeof body.scheduled_at === "string" ? body.scheduled_at : null
  const action: string =
    body.action === "schedule" || body.action === "publish_now" || body.action === "draft"
      ? body.action
      : "draft"

  let status: string
  if (action === "schedule") {
    if (!scheduled_at) {
      return NextResponse.json({ error: "scheduled_at is required for action=schedule" }, { status: 400 })
    }
    status = "scheduled"
  } else if (action === "publish_now") {
    status = "publishing"
  } else {
    status = "draft"
  }

  if (!supabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  const supabase = createClient()
  const tenant = await getCurrentTenant().catch(() => null)
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
  }

  const { data: post, error: insertErr } = await supabase
    .from("social_posts")
    .insert({
      tenant_id: tenant.id,
      status,
      source: "manual",
      caption,
      hashtags,
      media_urls,
      scheduled_at,
    } as never)
    .select()
    .single()

  if (insertErr || !post) {
    return NextResponse.json({ error: insertErr?.message ?? "Insert failed" }, { status: 500 })
  }

  // Create targets
  await createTargets((post as { id: string }).id, target_account_ids)

  // If publish_now, trigger publishing
  if (action === "publish_now") {
    await publishPost((post as { id: string }).id)
  }

  // Re-fetch with targets
  const { data: full, error: fetchErr } = await supabase
    .from("social_posts")
    .select("*, social_post_targets(*)")
    .eq("id", (post as { id: string }).id)
    .single()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  return NextResponse.json({ post: full }, { status: 201 })
}
