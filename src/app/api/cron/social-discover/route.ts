import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getTenantById } from "@/lib/tenant"
import { discoverAndDraft } from "@/lib/social/discover"
import { createTargets } from "@/lib/social/publish"
import type { SocialSettings } from "@/types"

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

// GET /api/cron/social-discover
// Called by Vercel Cron every 6 hours.
// For each tenant with auto_generate=true, discovers a trending topic and drafts a post.
// If autopublish=true, schedules the post 1 minute from now and creates targets.
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!supabaseConfigured()) {
    return NextResponse.json({ generated: 0, note: "Supabase not configured" })
  }

  const supabase = createClient()

  const { data: allSettings, error } = await supabase
    .from("social_settings")
    .select("*")
    .eq("auto_generate", true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let generated = 0

  for (const settings of allSettings ?? []) {
    const tenantId = (settings as { tenant_id: string }).tenant_id

    try {
      // Use the existing cached tenant lookup from @/lib/tenant
      const tenant = await getTenantById(tenantId)
      if (!tenant) continue

      const draft = await discoverAndDraft(
        { id: tenant.id, name: tenant.name },
        settings as unknown as SocialSettings,
      )

      const typedSettings = settings as unknown as SocialSettings
      const shouldAutopublish = typedSettings.autopublish === true

      // Determine status and scheduled_at
      const scheduledAt = shouldAutopublish
        ? new Date(Date.now() + 60 * 1000).toISOString()
        : null

      const { data: post, error: insertErr } = await supabase
        .from("social_posts")
        .insert({
          ...draft,
          status: shouldAutopublish ? "scheduled" : "ready",
          scheduled_at: scheduledAt,
        } as never)
        .select("id")
        .single()

      if (insertErr || !post) {
        console.error(`[cron/social-discover] Insert failed for tenant ${tenantId}:`, insertErr?.message)
        continue
      }

      if (shouldAutopublish) {
        // Create targets for all active accounts in this tenant
        const { data: accounts } = await supabase
          .from("social_accounts")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("status", "active")

        const accountIds = (accounts ?? []).map((a) => (a as { id: string }).id)
        if (accountIds.length > 0) {
          await createTargets((post as { id: string }).id, accountIds)
        }
      }

      generated++
    } catch (err) {
      console.error(`[cron/social-discover] Failed for tenant ${tenantId}:`, err)
    }
  }

  return NextResponse.json({ generated })
}
