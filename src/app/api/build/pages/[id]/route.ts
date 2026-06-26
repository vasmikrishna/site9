import { NextResponse } from "next/server"
import { getOwnerContext } from "@/lib/build-owner"
import { createClient } from "@/lib/supabase/server"
export const dynamic = "force-dynamic"

/** GET /api/build/pages/[id] — full HTML/CSS for one page of the active site. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await getOwnerContext()
  if (!owner) return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  const { id } = await params

  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("custom_pages")
    .select("id, slug, title, html, css, is_homepage, status")
    .eq("id", id)
    .eq("tenant_id", owner.tenant.id)
    .maybeSingle()

  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ page: data })
}
