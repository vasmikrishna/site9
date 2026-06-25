import { NextResponse } from "next/server"
import { getCurrentTenant } from "@/lib/tenant"
import { getMetaAuthUrl } from "@/lib/social/meta"

const isMockMode = () =>
  process.env.SOCIAL_MOCK === "1" || !process.env.META_APP_ID

// GET /api/social/meta/start
// Redirects to the Meta OAuth consent screen.
// In mock mode, redirects back to the admin social page with an error.
export async function GET(req: Request) {
  const { origin } = new URL(req.url)

  if (isMockMode()) {
    return NextResponse.redirect(`${origin}/admin/social?error=use_connect`)
  }

  try {
    const tenant = await getCurrentTenant().catch(() => null)
    const state = tenant?.id ?? "unknown"
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin
    const redirectUri = `${appUrl}/api/social/meta/callback`
    const authUrl = getMetaAuthUrl(state, redirectUri)
    return NextResponse.redirect(authUrl)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "meta_start_failed"
    const { origin: o } = new URL(req.url)
    return NextResponse.redirect(`${o}/admin/social?error=${encodeURIComponent(msg)}`)
  }
}
