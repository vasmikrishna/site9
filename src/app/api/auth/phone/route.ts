import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSession, createSession } from "@/lib/session"
export const dynamic = "force-dynamic"

/**
 * POST /api/auth/phone
 * Saves the signed-in user's mobile number and clears the `needsPhone` gate.
 * Used by /complete-profile, which Google sign-ins are funnelled to when they
 * have no phone on file (Google never returns one).
 */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const phone = String(body.phone ?? "").trim()
  if (!phone || (phone.match(/\d/g)?.length ?? 0) < 7) {
    return NextResponse.json({ error: "Enter a valid mobile number" }, { status: 400 })
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") || !(process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const { error } = await supabase.from("users").update({ phone }).ilike("email", session.email)
  if (error) return NextResponse.json({ error: "Could not save number" }, { status: 500 })

  // Re-issue the session without the gate so middleware stops redirecting.
  await createSession({
    id: session.id,
    email: session.email,
    name: session.name,
    role: session.role,
    tenant_id: session.tenant_id,
  })
  return NextResponse.json({ ok: true })
}
