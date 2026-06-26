import { NextResponse } from "next/server"
import { getSession, createSession } from "@/lib/session"
import { accountOwnsTenant } from "@/lib/sites"
export const dynamic = "force-dynamic"

/**
 * POST /api/sites/switch — set the active site for this account.
 * Verifies the account actually owns the target site before switching.
 */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session || session.id === "admin") {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }
  const { tenantId } = await req.json().catch(() => ({}))
  if (!tenantId || typeof tenantId !== "string") {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 })
  }
  if (!(await accountOwnsTenant(session.email, tenantId))) {
    return NextResponse.json({ error: "Not your site" }, { status: 403 })
  }
  await createSession({ ...session, tenant_id: tenantId })
  return NextResponse.json({ ok: true })
}
