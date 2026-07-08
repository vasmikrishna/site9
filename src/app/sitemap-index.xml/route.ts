import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "site9.in"

/**
 * Sitemap index (apex): lists every live tenant's sitemap so a single URL
 * submitted in Search Console leads Google to all *.site9.in sites. "Live" = an
 * active tenant with a published homepage (same rule as the /sites directory);
 * empty tenants that render the marketing fallback are left out. Referenced from
 * the apex robots.txt.
 */
export async function GET() {
  const sitemaps = [`https://${BASE_DOMAIN}/sitemap.xml`]

  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- custom_pages not in generated DB types
      const sb = createClient() as any
      const { data: homes } = await sb
        .from("custom_pages")
        .select("tenant_id")
        .eq("status", "published")
        .eq("is_homepage", true)
        .not("tenant_id", "is", null)
      const liveIds = [...new Set((homes ?? []).map((r: { tenant_id: string }) => r.tenant_id))]
      if (liveIds.length) {
        const { data: tenants } = await sb
          .from("tenants")
          .select("slug, custom_domain, domain_verified")
          .eq("status", "active")
          .in("id", liveIds)
        for (const t of tenants ?? []) {
          const origin =
            t.custom_domain && t.domain_verified ? `https://${t.custom_domain}` : `https://${t.slug}.${BASE_DOMAIN}`
          sitemaps.push(`${origin}/sitemap.xml`)
        }
      }
    }
  } catch {
    /* Supabase unavailable — fall back to just the apex sitemap */
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    sitemaps.map((s) => `  <sitemap><loc>${s}</loc></sitemap>`).join("\n") +
    `\n</sitemapindex>\n`

  return new Response(body, {
    headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
  })
}
