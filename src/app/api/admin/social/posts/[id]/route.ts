import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"
import { getCurrentTenant } from "@/lib/tenant"
import { createTargets, publishPost } from "@/lib/social/publish"

const supabaseConfigured = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// PATCH /api/admin/social/posts/[id]
// Body: { caption?, hashtags?, media_urls?, scheduled_at?, action?, target_account_ids? }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))

  if (!supabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  const supabase = createClient()
  const tenant = await getCurrentTenant().catch(() => null)

  const action: string | undefined = typeof body.action === "string" ? body.action : undefined

  // Build the update payload
  const updates: Record<string, unknown> = {}
  if (typeof body.caption === "string") updates["caption"] = body.caption.trim()
  if (Array.isArray(body.hashtags)) updates["hashtags"] = body.hashtags
  if (Array.isArray(body.media_urls)) updates["media_urls"] = body.media_urls
  if (typeof body.scheduled_at === "string" || body.scheduled_at === null)
    updates["scheduled_at"] = body.scheduled_at

  if (action === "approve") {
    updates["status"] = "ready"
  } else if (action === "schedule") {
    updates["status"] = "scheduled"
    if (typeof body.scheduled_at === "string") {
      updates["scheduled_at"] = body.scheduled_at
    }
  } else if (action === "publish_now") {
    updates["status"] = "publishing"
  }
  // action='save' or undefined: just apply field updates

  // Apply updates if any
  if (Object.keys(updates).length > 0) {
    let updateQuery = supabase.from("social_posts").update(updates as never).eq("id", id)
    if (tenant?.id) updateQuery = updateQuery.eq("tenant_id", tenant.id)
    const { error: updateErr } = await updateQuery
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // Handle target_account_ids: delete existing pending + recreate
  if (Array.isArray(body.target_account_ids) && (action === "schedule" || action === "save" || !action)) {
    // Delete pending targets for this post
    await supabase
      .from("social_post_targets")
      .delete()
      .eq("post_id", id)
      .eq("status", "pending")

    await createTargets(id, body.target_account_ids as string[])
  }

  // Trigger publishing if requested
  if (action === "publish_now") {
    // Ensure targets exist if provided
    if (Array.isArray(body.target_account_ids)) {
      await supabase
        .from("social_post_targets")
        .delete()
        .eq("post_id", id)
        .eq("status", "pending")
      await createTargets(id, body.target_account_ids as string[])
    }
    await publishPost(id)
  }

  // Re-fetch with targets
  const { data: full, error: fetchErr } = await supabase
    .from("social_posts")
    .select("*, social_post_targets(*)")
    .eq("id", id)
    .single()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  return NextResponse.json({ post: full })
}

// DELETE /api/admin/social/posts/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  if (!supabaseConfigured()) {
    return NextResponse.json({ ok: true })
  }

  const supabase = createClient()
  const tenant = await getCurrentTenant().catch(() => null)

  let query = supabase.from("social_posts").delete().eq("id", id)
  if (tenant?.id) query = query.eq("tenant_id", tenant.id)

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
