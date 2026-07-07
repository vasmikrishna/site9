import type { Metadata } from "next"
import { Card, CardContent } from "@/components/ui/card"
import { subdomainHost } from "@/lib/onboarding"

export const metadata: Metadata = {
  title: "Sites Made with Site9",
  description:
    "Live websites built and published with Site9, plus the latest posts from their blogs.",
  alternates: { canonical: "/sites" },
}

// No dynamic APIs are used, so without this Next bakes the directory in at
// build time and newly published sites never appear. Hourly ISR.
export const revalidate = 3600

interface DirectorySite {
  id: string
  name: string
  slug: string
  host: string
}

interface DirectoryPost {
  title: string
  url: string
  siteName: string
  published_at: string | null
}

const supabaseConfigured = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Every active tenant site with a published homepage, plus recent published
 * posts from those sites' blogs. This page is the apex's crawl path to the
 * subdomains — Google can't discover *.site9.in hosts without inbound links.
 */
async function getDirectory(): Promise<{ sites: DirectorySite[]; posts: DirectoryPost[] }> {
  try {
    if (!supabaseConfigured()) return { sites: [], posts: [] }
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- custom_pages/blog_posts not in generated DB types
    const { data: homepages } = await (supabase as any)
      .from("custom_pages")
      .select("tenant_id")
      .eq("status", "published")
      .eq("is_homepage", true)
      .not("tenant_id", "is", null)
    const liveTenantIds = [...new Set((homepages ?? []).map((p: { tenant_id: string }) => p.tenant_id))]
    if (liveTenantIds.length === 0) return { sites: [], posts: [] }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tenants } = await (supabase as any)
      .from("tenants")
      .select("id, name, slug, custom_domain, domain_verified")
      .eq("status", "active")
      .in("id", liveTenantIds)
      .order("name")

    const sites: DirectorySite[] = (tenants ?? []).map(
      (t: { id: string; name: string; slug: string; custom_domain: string | null; domain_verified: boolean }) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        host: t.custom_domain && t.domain_verified ? t.custom_domain : subdomainHost(t.slug),
      }),
    )
    const byId = new Map(sites.map((s) => [s.id, s]))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: postRows } = await (supabase as any)
      .from("blog_posts")
      .select("slug, title, published_at, tenant_id")
      .eq("status", "published")
      .in("tenant_id", [...byId.keys()])
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(24)

    const posts: DirectoryPost[] = (postRows ?? []).flatMap(
      (p: { slug: string; title: string; published_at: string | null; tenant_id: string }) => {
        const site = byId.get(p.tenant_id)
        return site
          ? [{ title: p.title, url: `https://${site.host}/blog/${p.slug}`, siteName: site.name, published_at: p.published_at }]
          : []
      },
    )

    return { sites, posts }
  } catch {
    return { sites: [], posts: [] }
  }
}

export default async function SitesDirectoryPage() {
  const { sites, posts } = await getDirectory()

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Made with Site9</h1>
        <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
          Live websites built and published with Site9. Every site below was launched in minutes.
        </p>
      </div>

      {sites.length === 0 ? (
        <p className="text-center text-muted-foreground">No published sites yet — yours could be the first.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => (
            <a
              key={site.id}
              href={`https://${site.host}`}
              data-testid={`site-link-${site.slug}`}
              className="group"
            >
              <Card className="h-full transition-colors group-hover:border-primary">
                <CardContent className="p-5">
                  <p className="font-semibold group-hover:text-primary transition-colors">{site.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{site.host}</p>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}

      {posts.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight mb-6">Latest from their blogs</h2>
          <ul className="space-y-3">
            {posts.map((post) => (
              <li key={post.url}>
                <a
                  href={post.url}
                  data-testid="site-blog-post-link"
                  className="text-sm hover:text-primary transition-colors"
                >
                  <span className="font-medium">{post.title}</span>
                  <span className="text-muted-foreground"> — {post.siteName}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
