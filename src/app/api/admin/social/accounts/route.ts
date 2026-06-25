import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"
import { getCurrentTenant } from "@/lib/tenant"
import type { SocialAccount } from "@/types"

const supabaseConfigured = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// GET /api/admin/social/accounts
// Returns all social accounts for the tenant, NEVER including access_token_enc.
export async function GET() {
  const session = await getSession()
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!supabaseConfigured()) {
    return NextResponse.json({ accounts: [] })
  }

  const supabase = createClient()
  const tenant = await getCurrentTenant().catch(() => null)

  let query = supabase
    .from("social_accounts")
    .select(
      "id, tenant_id, platform, external_id, name, username, avatar_url, token_expires_at, scopes, status, meta, created_at, updated_at",
    )
    .order("created_at", { ascending: false })

  if (tenant?.id) query = query.eq("tenant_id", tenant.id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Explicitly strip access_token_enc (it is not selected above, but be explicit)
  const accounts: Omit<SocialAccount, "access_token_enc">[] = (data ?? []).map((a) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ...safe } = a as Record<string, unknown>
    delete safe["access_token_enc"]
    return safe as unknown as Omit<SocialAccount, "access_token_enc">
  })

  return NextResponse.json({ accounts })
}
