import { ImageResponse } from "next/og"
import { getSiteSettings } from "@/lib/site-settings"
import { getCurrentTenant } from "@/lib/tenant"

// Dynamic social card for each blog post: the post title on a branded panel
// tinted with the site's primary colour. Falls back to the site name if the
// post can't be loaded so a card is always produced.
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const supabaseConfigured = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function getTitle(slug: string, tenantId: string | null): Promise<string | null> {
  if (!supabaseConfigured()) return null
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- blog_posts not in generated DB types
    let query = (supabase as any)
      .from("blog_posts")
      .select("title")
      .eq("slug", slug)
      .eq("status", "published")
    if (tenantId) query = query.eq("tenant_id", tenantId)
    const { data } = await query.maybeSingle()
    return (data?.title as string) ?? null
  } catch {
    return null
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const settings = await getSiteSettings()
  const tenant = await getCurrentTenant().catch(() => null)
  const siteName = settings.site_name ?? "Site9"
  const primary = settings.theme_primary || "#4f46e5"
  const title = (await getTitle(slug, tenant?.id ?? null)) ?? siteName

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: `linear-gradient(135deg, ${primary} 0%, #111827 100%)`,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 600, opacity: 0.85 }}>{siteName}</div>
        <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, display: "flex" }}>
          {title.length > 110 ? `${title.slice(0, 110)}…` : title}
        </div>
        <div style={{ fontSize: 28, opacity: 0.7 }}>Read more on the blog →</div>
      </div>
    ),
    { ...size },
  )
}
