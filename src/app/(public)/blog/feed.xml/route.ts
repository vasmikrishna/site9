import { getSiteSettings } from "@/lib/site-settings"
import { getCurrentTenant, getTenantSlug } from "@/lib/tenant"
import { getCanonicalOrigin } from "@/lib/seo"

// Tenant-aware RSS 2.0 feed of published posts. Lives at /blog/feed.xml and is
// referenced from the blog metadata so feed readers and search engines can
// discover new content. Request-time (reads headers/tenant) so it stays dynamic.
export const dynamic = "force-dynamic"

const supabaseConfigured = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

type FeedPost = {
  slug: string
  title: string
  excerpt: string | null
  published_at: string | null
  updated_at: string | null
}

export async function GET() {
  const settings = await getSiteSettings()
  const slug = await getTenantSlug()
  const tenant = await getCurrentTenant().catch(() => null)
  const origin = getCanonicalOrigin(tenant, slug)
  const siteName = settings.site_name ?? "Site9"
  const description = settings.site_tagline ?? `Latest from ${siteName}`

  let posts: FeedPost[] = []
  if (supabaseConfigured()) {
    try {
      const { createClient } = await import("@/lib/supabase/server")
      const supabase = await createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- blog_posts not in generated DB types
      let query = (supabase as any)
        .from("blog_posts")
        .select("slug, title, excerpt, published_at, updated_at")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(50)
      if (tenant) query = query.eq("tenant_id", tenant.id)
      const { data } = await query
      posts = (data ?? []) as FeedPost[]
    } catch {
      posts = []
    }
  }

  const items = posts
    .map((post) => {
      const url = `${origin}/blog/${post.slug}`
      const date = post.published_at ?? post.updated_at
      const pubDate = date ? new Date(date).toUTCString() : ""
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      ${post.excerpt ? `<description>${escapeXml(post.excerpt)}</description>` : ""}
      ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ""}
    </item>`
    })
    .join("\n")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)} — Blog</title>
    <link>${escapeXml(origin)}/blog</link>
    <description>${escapeXml(description)}</description>
    <language>en</language>
    <atom:link href="${escapeXml(origin)}/blog/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=3600",
    },
  })
}
