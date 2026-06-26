import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getOwnerContext } from "@/lib/build-owner"
import { splitAiHtml } from "@/lib/ai-website-prompt"
import { stripEditorMarkers } from "@/lib/curated-templates"

export async function POST(req: Request) {
  const owner = await getOwnerContext()
  if (!owner) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const raw = String(body.html ?? "")
  if (raw.trim().length < 40) {
    return NextResponse.json({ error: "No content to save" }, { status: 400 })
  }

  const split = splitAiHtml(raw)
  const html = stripEditorMarkers(split.html || raw)
  const css = split.css || ""

  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from("custom_pages")
    .select("id, status")
    .eq("tenant_id", owner.tenant.id)
    .eq("is_homepage", true)
    .maybeSingle()

  const row = {
    tenant_id: owner.tenant.id,
    slug: "home",
    title: owner.tenant.name,
    html,
    css,
    template: "ai",
    is_homepage: true,
    ...(existing?.status === "published" ? {} : { status: "draft" }),
  }

  const write = existing?.id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? await (supabase as any).from("custom_pages").update({ html, css, updated_at: new Date().toISOString() }).eq("id", existing.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : await (supabase as any).from("custom_pages").insert(row)

  if (write.error) {
    return NextResponse.json({ error: "Could not save draft" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const owner = await getOwnerContext()
  if (!owner) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("custom_pages")
    .select("html, css, status, updated_at")
    .eq("tenant_id", owner.tenant.id)
    .eq("is_homepage", true)
    .maybeSingle()

  if (!data?.html) {
    return NextResponse.json({ html: null })
  }

  const fullHtml = data.css
    ? `<style>${data.css}</style>${data.html}`
    : data.html

  return NextResponse.json({ html: fullHtml, status: data.status, updatedAt: data.updated_at })
}
