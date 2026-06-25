import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { publishPost } from "@/lib/social/publish"

export const dynamic = "force-dynamic"

const supabaseConfigured = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  // Allow unauthenticated in dev when CRON_SECRET is not set
  if (!cronSecret && process.env.NODE_ENV !== "production") return true
  if (!cronSecret) return false
  const auth = req.headers.get("authorization") ?? ""
  return auth === `Bearer ${cronSecret}`
}

// GET /api/cron/social-publish
// Called by Vercel Cron every 5 minutes.
// Finds all scheduled posts whose scheduled_at <= now() and publishes them.
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!supabaseConfigured()) {
    return NextResponse.json({ processed: 0, note: "Supabase not configured" })
  }

  const supabase = createClient()

  const { data: posts, error } = await supabase
    .from("social_posts")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let processed = 0
  for (const post of posts ?? []) {
    try {
      await publishPost((post as { id: string }).id)
      processed++
    } catch (err) {
      console.error(`[cron/social-publish] Failed to publish post ${(post as { id: string }).id}:`, err)
    }
  }

  return NextResponse.json({ processed })
}
