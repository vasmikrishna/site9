import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

async function assertSuperAdmin() {
  const session = await getSession()
  if (!session || session.email !== process.env.ADMIN_EMAIL) return null
  return session
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// GET — list a single site's blog posts (super admin only).
// Requires ?tenant_id so the picker drives which site's posts load.
export async function GET(request: Request) {
  if (!await assertSuperAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const tenantId = new URL(request.url).searchParams.get("tenant_id")
  if (!tenantId) return NextResponse.json({ posts: [] })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ posts: data ?? [] })
}

// POST — author a new post on behalf of a specific site (super admin only).
export async function POST(request: Request) {
  if (!await assertSuperAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json().catch(() => ({}))

  const tenant_id = typeof body.tenant_id === "string" ? body.tenant_id : ""
  if (!tenant_id) return NextResponse.json({ error: "tenant_id is required" }, { status: 400 })

  const title = typeof body.title === "string" ? body.title.trim() : ""
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 })

  const slug =
    typeof body.slug === "string" && body.slug.trim() ? slugify(body.slug) : slugify(title)
  if (!slug) return NextResponse.json({ error: "A valid slug is required" }, { status: 400 })

  const status = body.status === "published" ? "published" : "draft"
  const record = {
    tenant_id,
    title,
    slug,
    excerpt: typeof body.excerpt === "string" ? body.excerpt : "",
    content_html: typeof body.content_html === "string" ? body.content_html : "",
    content_json: body.content_json ?? null,
    cover_image_url: typeof body.cover_image_url === "string" ? body.cover_image_url : null,
    author_name: typeof body.author_name === "string" ? body.author_name : null,
    status,
    published_at: status === "published" ? new Date().toISOString() : null,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const { data, error } = await supabase.from("blog_posts").insert(record).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post: data })
}
