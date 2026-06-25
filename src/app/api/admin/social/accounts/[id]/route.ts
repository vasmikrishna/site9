import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"
import { getCurrentTenant } from "@/lib/tenant"

const supabaseConfigured = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// DELETE /api/admin/social/accounts/[id]
// Hard-deletes the social account scoped to the current tenant.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  if (!supabaseConfigured()) {
    return NextResponse.json({ ok: true })
  }

  const supabase = createClient()
  const tenant = await getCurrentTenant().catch(() => null)

  let query = supabase.from("social_accounts").delete().eq("id", id)
  if (tenant?.id) query = query.eq("tenant_id", tenant.id)

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
