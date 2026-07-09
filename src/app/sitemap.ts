import type { MetadataRoute } from "next"
import { getTenantSlug, getCurrentTenant } from "@/lib/tenant"
import { getCanonicalOrigin, isMainSite } from "@/lib/seo"
import { FEATURES } from "@/lib/features"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slug = await getTenantSlug()
  const tenant = await getCurrentTenant().catch(() => null)
  const origin = getCanonicalOrigin(tenant, slug)
  const now = new Date()

  const mainSite = isMainSite(slug)

  const entries: MetadataRoute.Sitemap = [
    { url: origin, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${origin}/about`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${origin}/services`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${origin}/contact`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
  ]

  // Marketing pages that only live on the apex site.
  if (mainSite) {
    entries.push({ url: `${origin}/templates`, lastModified: now, changeFrequency: "daily", priority: 0.7 })
    entries.push({ url: `${origin}/pricing`, lastModified: now, changeFrequency: "daily", priority: 0.8 })
    entries.push({ url: `${origin}/open-source`, lastModified: now, changeFrequency: "daily", priority: 0.6 })
    entries.push({ url: `${origin}/sites`, lastModified: now, changeFrequency: "daily", priority: 0.7 })
  }

  // Custom pages and blog posts. On the apex (mainSite, no tenant) this is
  // Site9's OWN content — rows with tenant_id NULL. A customer's pages live on
  // their subdomain and must NOT be listed under site9.in, or Google indexes
  // duplicate/foreign content on the apex.
  if (FEATURES.pageBuilder) {
    await appendCustomPageUrls(entries, origin, tenant?.id ?? null)
  }

  if (FEATURES.blog) {
    entries.push({ url: `${origin}/blog`, lastModified: now, changeFrequency: "daily", priority: 0.7 })
    await appendBlogUrls(entries, origin, tenant?.id ?? null)
  }

  return entries
}

async function appendBlogUrls(
  entries: MetadataRoute.Sitemap,
  origin: string,
  tenantId: string | null,
) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http")) return
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- blog_posts not in generated DB types
    let query = (supabase as any)
      .from("blog_posts")
      .select("slug, updated_at")
      .eq("status", "published")
    query = tenantId ? query.eq("tenant_id", tenantId) : query.is("tenant_id", null)
    const { data } = await query
    const rows = (data ?? []) as { slug: string; updated_at: string | null }[]
    for (const post of rows) {
      entries.push({
        url: `${origin}/blog/${post.slug}`,
        lastModified: post.updated_at ? new Date(post.updated_at) : new Date(),
        changeFrequency: "daily",
        priority: 0.6,
      })
    }
  } catch {
    /* Supabase unavailable — skip dynamic blog posts */
  }
}

async function appendCustomPageUrls(
  entries: MetadataRoute.Sitemap,
  origin: string,
  tenantId: string | null,
) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http")) return
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    let query = supabase
      .from("custom_pages")
      .select("slug, updated_at")
      .eq("status", "published")
      .eq("is_homepage", false)
    query = tenantId ? query.eq("tenant_id", tenantId) : query.is("tenant_id", null)
    const { data } = await query
    for (const page of data ?? []) {
      entries.push({
        url: `${origin}/p/${page.slug}`,
        lastModified: page.updated_at ? new Date(page.updated_at) : new Date(),
        changeFrequency: "daily",
        priority: 0.5,
      })
    }
  } catch {
    /* Supabase unavailable — skip dynamic pages */
  }
}
