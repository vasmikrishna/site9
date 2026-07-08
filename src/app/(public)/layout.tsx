import type { Metadata } from "next"
import { getSiteSettings } from "@/lib/site-settings"
import { getTenantSlug, getCurrentTenant } from "@/lib/tenant"
import { getCanonicalOrigin, isMainSite, buildLocalBusinessJsonLd, buildWebSiteJsonLd, buildOrganizationJsonLd } from "@/lib/seo"
import { SiteHeader, type HeaderAuth } from "@/components/site/header"
import { SiteFooter } from "@/components/site/footer"
import { MarketingHeader } from "@/components/public/marketing-header"
import { MarketingFooter } from "@/components/public/marketing-footer"
import { getSession } from "@/lib/session"

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  const slug = await getTenantSlug()
  const tenant = await getCurrentTenant().catch(() => null)
  const origin = getCanonicalOrigin(tenant, slug)
  const siteName = settings.site_name ?? "Site9"
  const description = settings.site_tagline ?? "One Website for Every Business"

  return {
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description,
    metadataBase: new URL(origin),
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName,
      title: siteName,
      description,
      url: origin,
      ...(tenant?.logo_url ? { images: [{ url: tenant.logo_url, alt: siteName }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description,
      ...(tenant?.logo_url ? { images: [tenant.logo_url] } : {}),
    },
  }
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings()
  const slug = await getTenantSlug()
  const tenant = await getCurrentTenant().catch(() => null)
  const origin = getCanonicalOrigin(tenant, slug)
  const siteName = settings.site_name ?? "Site9"

  // The session cookie is shared across all *.site9.in subdomains, so a visitor
  // who is signed in anywhere shows as logged-in here. The hub (/account) is the
  // cross-tenant entry point; the dropdown also deep-links into the active role's
  // dashboard. Super-admin is treated as logged-out for the public chrome.
  const session = await getSession()
  const auth: HeaderAuth | null =
    session && session.id !== "admin"
      ? { name: session.name, email: session.email, role: session.role }
      : null

  const jsonLdScripts = isMainSite(slug)
    ? [
        buildWebSiteJsonLd(origin, siteName),
        buildOrganizationJsonLd(origin, siteName, tenant?.logo_url),
      ]
    : [
        buildWebSiteJsonLd(origin, siteName),
        ...(tenant ? [buildLocalBusinessJsonLd(tenant, settings, origin)] : []),
      ]

  const mainSite = isMainSite(slug)

  // Tenant sites use their own brand theme; Site9's own pages (the apex) use the
  // marketing theme tokens so shared (public) pages like /blog match /pricing &
  // /templates instead of inheriting a tenant's colors.
  // --site-surface (card background) and --site-on-primary (text sitting on a
  // --site-primary banner) let the shared (public) pages adapt to the marketing
  // light/dark toggle on the apex without white-on-white text. Tenants keep the
  // fixed white values these spots used to hardcode, so their look is unchanged.
  const cssVars = mainSite
    ? `
    :root {
      --site-primary: var(--foreground);
      --site-secondary: var(--muted);
      --site-accent: var(--accent);
      --site-bg: var(--background);
      --site-text: var(--foreground);
      --site-surface: var(--card);
      --site-on-primary: var(--background);
    }
  `
    : `
    :root {
      --site-primary: ${settings.theme_primary};
      --site-secondary: ${settings.theme_secondary};
      --site-accent: ${settings.theme_accent};
      --site-bg: ${settings.theme_bg};
      --site-text: ${settings.theme_text};
      --site-surface: #ffffff;
      --site-on-primary: #ffffff;
    }
  `

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      {jsonLdScripts.map((ld, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}
      {mainSite ? (
        <div className="min-h-screen bg-background text-foreground">
          <MarketingHeader />
          <main>{children}</main>
          <MarketingFooter />
        </div>
      ) : (
        <div style={{ background: "var(--site-bg)", color: "var(--site-text)", minHeight: "100vh" }}>
          <SiteHeader settings={settings} auth={auth} />
          <main>{children}</main>
          <SiteFooter settings={settings} />
        </div>
      )}
    </>
  )
}
