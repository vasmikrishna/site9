import { notFound } from "next/navigation"
import type { Metadata } from "next"
import type { CustomPage } from "@/types"
import { sanitizeHtml, sanitizeCss } from "@/lib/sanitize-html"
import { FormHandler } from "@/components/public/form-handler"

async function getPublishedPage(slug: string): Promise<CustomPage | null> {
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const { getCurrentTenant } = await import("@/lib/tenant")
    const supabase = createClient()
    const tenant = await getCurrentTenant().catch(() => null)
    let query = supabase
      .from("custom_pages")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
    if (tenant?.id) query = query.eq("tenant_id", tenant.id)
    const { data } = await query.maybeSingle()
    return (data as CustomPage | null) ?? null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const page = await getPublishedPage(slug)
  if (!page) return { title: "Page not found" }
  return {
    title: page.title,
    alternates: { canonical: `/p/${slug}` },
    openGraph: { title: page.title },
  }
}

export default async function CustomPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await getPublishedPage(slug)

  if (!page) notFound()

  return (
    <FormHandler>
      <style dangerouslySetInnerHTML={{ __html: sanitizeCss(page.css) }} />
      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.html) }} />
    </FormHandler>
  )
}
