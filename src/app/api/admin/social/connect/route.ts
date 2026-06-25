import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"
import { getCurrentTenant } from "@/lib/tenant"
import { mockConnectAccounts } from "@/lib/social/provider"
import { getMetaAuthUrl } from "@/lib/social/meta"

const supabaseConfigured = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const isMockMode = () =>
  process.env.SOCIAL_MOCK === "1" || !process.env.META_APP_ID

// POST /api/admin/social/connect
// Body: { platform?: string }
// Mock mode: upserts fake accounts and returns them.
// Real mode: returns a Meta OAuth URL to redirect the user to.
export async function POST(req: Request) {
  const session = await getSession()
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const tenant = await getCurrentTenant().catch(() => null)
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
  }

  if (isMockMode()) {
    if (!supabaseConfigured()) {
      const fakeAccounts = mockConnectAccounts(tenant.id)
      return NextResponse.json({ accounts: fakeAccounts, mock: true })
    }

    const supabase = createClient()
    const inserts = mockConnectAccounts(tenant.id)

    const { data, error } = await supabase
      .from("social_accounts")
      .upsert(inserts as never, { onConflict: "tenant_id,platform,external_id" })
      .select(
        "id, tenant_id, platform, external_id, name, username, avatar_url, token_expires_at, scopes, status, meta, created_at, updated_at",
      )

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ accounts: data ?? [], mock: true })
  }

  // Real Meta OAuth flow
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
  const redirectUri = `${appUrl}/api/social/meta/callback`
  const state = tenant.id

  try {
    const authUrl = getMetaAuthUrl(state, redirectUri)
    return NextResponse.json({ authUrl, mock: false })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
