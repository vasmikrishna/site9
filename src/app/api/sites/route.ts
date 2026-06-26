import { NextResponse } from "next/server"
import { getSession, createSession } from "@/lib/session"
import { getSitesForEmail, createSiteForEmail } from "@/lib/sites"
export const dynamic = "force-dynamic"

/** GET /api/sites — list the sites this account owns. */
export async function GET() {
  const session = await getSession()
  if (!session || session.id === "admin") {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }
  const sites = await getSitesForEmail(session.email)
  return NextResponse.json({ sites })
}

/** POST /api/sites — create a new site, owned by this account, and make it active. */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session || session.id === "admin") {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const name = String(body.name ?? "").trim() || "My Site"

  const site = await createSiteForEmail(session.email, name)
  if (!site) return NextResponse.json({ error: "Could not create site" }, { status: 500 })

  // Make the new site the active one for the builder.
  await createSession({ ...session, tenant_id: site.tenantId })
  return NextResponse.json({ ok: true, ...site })
}
