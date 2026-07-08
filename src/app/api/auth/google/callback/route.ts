import { NextResponse } from "next/server"
import { createSession } from "@/lib/session"
import { getSitesForEmail } from "@/lib/sites"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(`${origin}/login?error=google_cancelled`)
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin
    const redirectUri = `${appUrl}/api/auth/google/callback`

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    })

    const tokens = await tokenRes.json()
    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokens.error}`)

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const googleUser = await userRes.json()
    if (!googleUser.email) throw new Error("No email returned from Google")

    // Super-admin → platform console.
    const adminEmail = process.env.ADMIN_EMAIL
    if (googleUser.email === adminEmail) {
      await createSession({ id: "admin", email: googleUser.email, name: googleUser.name ?? "Admin", role: "admin", tenant_id: "" })
      return NextResponse.redirect(`${origin}/superadmin`)
    }

    // Regular user — global account (one per email), owns many sites.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    let userId = googleUser.id ?? googleUser.sub
    let userName = googleUser.name ?? googleUser.email
    // Google never returns a phone, so a Gmail account has one only if it was
    // captured earlier. When missing we force /complete-profile after sign-in.
    let needsPhone = true

    if (supabaseUrl?.startsWith("http") && supabaseKey) {
      try {
        const { createClient } = await import("@supabase/supabase-js")
        const supabase = createClient(supabaseUrl, supabaseKey)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existing } = await (supabase as any)
          .from("users").select("id, name, phone").ilike("email", googleUser.email).maybeSingle()
        if (existing) {
          userId = existing.id
          userName = existing.name ?? userName
          needsPhone = !existing.phone
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: created } = await (supabase as any)
            .from("users")
            .insert({ email: googleUser.email, name: userName, role: "admin", tenant_id: null })
            .select("id, name").single()
          if (created) { userId = created.id; userName = created.name }
          needsPhone = true
        }
      } catch { /* fall through with Google id */ }
    }

    const sites = await getSitesForEmail(googleUser.email)
    await createSession({
      id: userId,
      email: googleUser.email,
      name: userName,
      role: "admin",
      tenant_id: sites[0]?.id ?? "",
      needsPhone,
    })
    return NextResponse.redirect(`${origin}${needsPhone ? "/complete-profile" : "/dashboard"}`)
  } catch (err) {
    console.error("[google/callback]", err)
    return NextResponse.redirect(`${origin}/login?error=google_failed`)
  }
}
