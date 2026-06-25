import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { exchangeCodeForToken, listPagesAndInstagram } from "@/lib/social/meta"
import { encryptToken } from "@/lib/social/crypto"
import type { SocialPlatform } from "@/types"

// GET /api/social/meta/callback?code=&state=
// Exchanges the OAuth code, lists FB pages + IG accounts, upserts social_accounts.
// Redirects to /admin/social?connected=1 on success, ?error=... on failure.
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state") // state = tenant.id
  const errorParam = searchParams.get("error")

  if (errorParam || !code) {
    return NextResponse.redirect(`${origin}/admin/social?error=meta_cancelled`)
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin
    const redirectUri = `${appUrl}/api/social/meta/callback`

    // Exchange code for long-lived token
    const { accessToken, expiresAt } = await exchangeCodeForToken(code, redirectUri)

    // List Facebook pages and Instagram accounts
    const connectedAccounts = await listPagesAndInstagram(accessToken)

    const supabase = createClient()
    const tenantId = state ?? ""

    // Upsert each account
    const rows = connectedAccounts.map((a) => ({
      tenant_id: tenantId,
      platform: a.platform as SocialPlatform,
      external_id: a.externalId,
      name: a.name,
      username: a.username,
      avatar_url: a.avatarUrl,
      access_token_enc: encryptToken(a.pageAccessToken),
      token_expires_at: expiresAt.toISOString(),
      scopes: [],
      status: "active" as const,
      meta: {},
    }))

    if (rows.length > 0) {
      await supabase
        .from("social_accounts")
        .upsert(rows as never, { onConflict: "tenant_id,platform,external_id" })
    }

    return NextResponse.redirect(`${origin}/admin/social?connected=1`)
  } catch (err) {
    console.error("[meta/callback]", err)
    const msg = err instanceof Error ? err.message : "meta_callback_failed"
    return NextResponse.redirect(
      `${origin}/admin/social?error=${encodeURIComponent(msg)}`,
    )
  }
}
