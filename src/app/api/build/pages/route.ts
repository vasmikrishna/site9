import { NextResponse } from "next/server"
import { getOwnerContext } from "@/lib/build-owner"
import { createClient } from "@/lib/supabase/server"
import { slugify } from "@/lib/onboarding"
export const dynamic = "force-dynamic"

const RESERVED = new Set(["home", "p", "api", "admin", "build", "blog", "book"])

/** GET /api/build/pages — list the active site's pages (lightweight). */
export async function GET() {
  const owner = await getOwnerContext()
  if (!owner) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("custom_pages")
    .select("id, slug, title, is_homepage, status, updated_at")
    .eq("tenant_id", owner.tenant.id)
    .order("is_homepage", { ascending: false })
    .order("updated_at", { ascending: false })

  return NextResponse.json({ pages: data ?? [] })
}

/** POST /api/build/pages — create a new (blank, draft) page for the active site. */
export async function POST(req: Request) {
  const owner = await getOwnerContext()
  if (!owner) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const title = String(body.title ?? "").trim()
  if (!title) return NextResponse.json({ error: "Page title is required" }, { status: 400 })

  let slug = slugify(body.slug ? String(body.slug) : title)
  if (!slug || RESERVED.has(slug)) {
    return NextResponse.json({ error: "Pick a different page name" }, { status: 400 })
  }

  const supabase = createClient()
  // Ensure the slug is unique within this site.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: clash } = await (supabase as any)
    .from("custom_pages").select("id").eq("tenant_id", owner.tenant.id).eq("slug", slug).maybeSingle()
  if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`

  const now = new Date().toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: page, error } = await (supabase as any)
    .from("custom_pages")
    .insert({
      tenant_id: owner.tenant.id,
      slug,
      title,
      html: `<section style="padding:120px 24px;text-align:center;max-width:1200px;margin:0 auto;"><h1 style="font-size:clamp(2rem,5vw,3.5rem);font-weight:800;letter-spacing:-0.02em;" data-s9-edit="page-heading" data-s9-type="text">${title}</h1><p style="color:#6b7280;margin-top:16px;" data-s9-edit="page-sub" data-s9-type="text">Start building this page — describe a change in the prompt bar below.</p></section>`,
      css: "",
      template: "blank",
      status: "draft",
      is_homepage: false,
      created_at: now,
      updated_at: now,
    })
    .select("id, slug, title, is_homepage, status")
    .single()

  if (error || !page) {
    console.error("[build/pages] create failed:", error?.message)
    return NextResponse.json({ error: "Could not create page" }, { status: 500 })
  }
  return NextResponse.json({ page })
}

/** DELETE /api/build/pages?id=… — remove a non-homepage page. */
export async function DELETE(req: Request) {
  const owner = await getOwnerContext()
  if (!owner) return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: page } = await (supabase as any)
    .from("custom_pages").select("is_homepage").eq("id", id).eq("tenant_id", owner.tenant.id).maybeSingle()
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (page.is_homepage) return NextResponse.json({ error: "Can't delete the home page" }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("custom_pages").delete().eq("id", id).eq("tenant_id", owner.tenant.id)
  return NextResponse.json({ ok: true })
}
