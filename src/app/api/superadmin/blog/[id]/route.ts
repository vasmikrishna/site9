import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { createClient } from "@/lib/supabase/server"
import type { BlogPostStatus } from "@/types"

export const dynamic = "force-dynamic"

const STATUSES: BlogPostStatus[] = ["draft", "published"]

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

// GET — fetch a single post by id, any site (super admin only).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await assertSuperAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const { data, error } = await supabase.from("blog_posts").select("*").eq("id", id).single()

  if (error) {
    if (error.code === "PGRST116") return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ post: data })
}

// PATCH — full edit of any site's post (super admin only). Authoring + moderation.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await assertSuperAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const update: Record<string, unknown> = {}

  if (typeof body.title === "string" && body.title.trim()) update.title = body.title.trim()
  if (typeof body.slug === "string" && body.slug.trim()) {
    const slug = slugify(body.slug)
    if (!slug) return NextResponse.json({ error: "Invalid slug" }, { status: 400 })
    update.slug = slug
  }
  if (typeof body.excerpt === "string") update.excerpt = body.excerpt
  if (typeof body.content_html === "string") update.content_html = body.content_html
  if (body.content_json !== undefined) update.content_json = body.content_json
  if (typeof body.cover_image_url === "string") update.cover_image_url = body.cover_image_url
  if (typeof body.author_name === "string") update.author_name = body.author_name
  if (typeof body.status === "string") {
    if (!STATUSES.includes(body.status as BlogPostStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }
    update.status = body.status
    if (body.status === "published" && !body.published_at) {
      update.published_at = new Date().toISOString()
    }
    if (body.status === "draft") update.published_at = null
  }
  if (typeof body.published_at === "string") update.published_at = body.published_at

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const { data, error } = await supabase
    .from("blog_posts")
    .update(update)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    if (error.code === "PGRST116") return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ post: data })
}

// DELETE — remove any site's post (super admin only).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await assertSuperAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const { error } = await supabase.from("blog_posts").delete().eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
