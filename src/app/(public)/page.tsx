import Link from "next/link"
import { unstable_cache } from "next/cache"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Check, Mail, GitPullRequest, BookOpen, Code2 } from "lucide-react"
import { MOCK_CUSTOM_PAGES } from "@/lib/mock-data"
import type { CustomPage } from "@/types"
import { sanitizeHtml, sanitizeCss } from "@/lib/sanitize-html"
import { FEATURES } from "@/lib/features"
import { FormHandler } from "@/components/public/form-handler"
import { TemplateCarousel } from "@/components/public/template-carousel"
import { ThemeToggle } from "@/components/ui/theme-toggle"

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

const supabaseConfigured = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Cached per tenant slug. Published sites change rarely, so we serve from
// Next.js' Data Cache instead of hitting Supabase on every visit. The cache
// key includes the slug, so one tenant can never receive another's content.
// Publishing a new page busts this via revalidateTag(`tenant-page-${slug}`).
const fetchHomepageOverride = (slug: string) =>
  unstable_cache(
    async (): Promise<CustomPage | null> => {
      const { createClient } = await import("@/lib/supabase/server")
      const supabase = createClient()
      const [tenantRes, pagesRes] = await Promise.all([
        supabase.from("tenants").select("id").eq("slug", slug).eq("status", "active").maybeSingle(),
        supabase.from("custom_pages").select("*").eq("is_homepage", true).eq("status", "published"),
      ])
      const tenantId = (tenantRes.data as { id: string } | null)?.id
      const pages = pagesRes.data as CustomPage[] | null
      if (!tenantId || !pages?.length) return null
      return pages.find((p) => p.tenant_id === tenantId) ?? null
    },
    ["homepage-override", slug],
    { tags: [`tenant-page-${slug}`], revalidate: 300 }
  )()

async function getHomepageOverride(): Promise<CustomPage | null> {
  if (!FEATURES.pageBuilder) return null
  if (!supabaseConfigured()) {
    return MOCK_CUSTOM_PAGES.find((p) => p.is_homepage && p.status === "published") ?? null
  }
  try {
    const { getTenantSlug } = await import("@/lib/tenant")
    const slug = await getTenantSlug()
    if (slug === "site9" || !slug) return null
    return await fetchHomepageOverride(slug)
  } catch {
    return null
  }
}

const NAV_LINKS = [
  { href: "/templates", label: "Templates" },
  { href: "/pricing", label: "Pricing" },
  { href: "/open-source", label: "Open Source" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
]

export default async function LandingPage() {
  const homepageOverride = await getHomepageOverride()
  if (homepageOverride) {
    return (
      <FormHandler>
        <style dangerouslySetInnerHTML={{ __html: sanitizeCss(homepageOverride.css) }} />
        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(homepageOverride.html) }} />
      </FormHandler>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center" data-testid="home-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/site9-logo.png" alt="Site9 — One Website for Every Business" className="h-10 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(link => (
              <a key={link.href} href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link.label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a
              href="https://github.com/vasmikrishna/site9"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid="nav-github-link"
              aria-label="GitHub repository"
            >
              <GitHubIcon className="h-5 w-5" />
            </a>
            <Button asChild variant="ghost" size="sm"><Link href="/login">Sign in</Link></Button>
            <Button asChild variant="brand" size="sm"><Link href="/start">Get started</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Badge variant="outline">A website for every business</Badge>
          <Badge variant="brand">Open Source</Badge>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
          One Website for Every Business
        </h1>
        <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Whether you&apos;re a local shop, freelancer, photographer, restaurant, salon, PG owner, consultant, or startup — Site9 makes it simple, affordable, and accessible to get your business online. No coding. No design skills. No complicated setup.
        </p>
        <div className="flex items-center justify-center gap-4 mt-10">
          <Button asChild variant="brand" size="lg">
            <Link href="/start">Create your website <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/templates">Browse templates</Link>
          </Button>
        </div>

        {/* Trust bar */}
        <div className="flex items-center justify-center gap-8 mt-16 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Launch in minutes</span>
          <span className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Free yourbusiness.site9.in subdomain</span>
          <span className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> No coding needed</span>
          <span className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Works on any device</span>
        </div>
      </section>

      {/* Templates */}
      <section id="templates" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">100+ ready-made templates</h2>
            <p className="text-muted-foreground mt-2">Pick a template, customize it, and launch your site in minutes.</p>
          </div>
          <TemplateCarousel />
          <div className="text-center mt-10">
            <Button asChild variant="outline" size="lg" data-testid="browse-all-templates">
              <Link href="/templates">Browse all templates <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="bg-muted/40 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-5">
              <h2 className="text-3xl font-bold">About Site9</h2>
              <p className="text-muted-foreground leading-relaxed text-lg">
                <strong className="text-foreground">Our vision</strong> is to bring every business online. We imagine a future where having a website is as common as having a phone number, email, or WhatsApp account. Every business deserves its own digital identity.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Millions of businesses still rely only on social media, WhatsApp, or word of mouth — and building a website is too often expensive, slow, and technically complex. Site9 removes the barriers.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Getting online shouldn&apos;t be complicated. Getting a website shouldn&apos;t require a developer. Every business deserves a professional online presence.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" /> No coding — launch in minutes
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" /> Free yourbusiness.site9.in subdomain
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" /> Simple, affordable, and accessible
                </div>
              </div>
              <Link
                href="/start"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-full px-4 py-2"
              >
                Create your website
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card><CardContent className="pt-6 pb-5 px-5">
                <p className="text-3xl font-bold">Minutes</p>
                <p className="text-sm text-muted-foreground mt-1">to launch</p>
              </CardContent></Card>
              <Card><CardContent className="pt-6 pb-5 px-5">
                <p className="text-3xl font-bold">No code</p>
                <p className="text-sm text-muted-foreground mt-1">needed</p>
              </CardContent></Card>
              <Card><CardContent className="pt-6 pb-5 px-5">
                <p className="text-3xl font-bold">Free</p>
                <p className="text-sm text-muted-foreground mt-1">subdomain</p>
              </CardContent></Card>
              <Card><CardContent className="pt-6 pb-5 px-5">
                <p className="text-3xl font-bold">Any device</p>
                <p className="text-sm text-muted-foreground mt-1">responsive</p>
              </CardContent></Card>
            </div>
          </div>
        </div>
      </section>

      {/* Open Source */}
      <section id="open-source" className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge variant="brand" className="mb-4">Open Source</Badge>
            <h2 className="text-3xl font-bold">Built in the open</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              Site9 is fully open source. Browse the code, report issues, suggest features, or contribute directly. Every business deserves great software — and great software is built together.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <Card>
              <CardContent className="p-6 space-y-3">
                <Code2 className="h-6 w-6 text-muted-foreground" />
                <h3 className="font-semibold">Templates</h3>
                <p className="text-sm text-muted-foreground">
                  Design and contribute website templates for different industries.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 space-y-3">
                <GitPullRequest className="h-6 w-6 text-muted-foreground" />
                <h3 className="font-semibold">Features</h3>
                <p className="text-sm text-muted-foreground">
                  Build new features — SEO tools, analytics, integrations, and more.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 space-y-3">
                <Check className="h-6 w-6 text-green-500" />
                <h3 className="font-semibold">Bug fixes</h3>
                <p className="text-sm text-muted-foreground">
                  Find and fix bugs to make Site9 more reliable for everyone.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 space-y-3">
                <BookOpen className="h-6 w-6 text-muted-foreground" />
                <h3 className="font-semibold">Documentation</h3>
                <p className="text-sm text-muted-foreground">
                  Improve guides, tutorials, and API docs to help others get started.
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="flex items-center justify-center gap-4">
            <Button asChild variant="outline" size="lg" data-testid="open-source-cta">
              <a href="https://github.com/vasmikrishna/site9" target="_blank" rel="noopener noreferrer">
                <GitHubIcon className="h-4 w-4" /> View on GitHub <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/open-source">Learn more <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-muted/40 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl font-bold">Get in touch</h2>
          <p className="text-muted-foreground text-lg">
            Ready to get your business online? Create your website now, or reach out and we&apos;ll help you get started.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild variant="brand" size="lg">
              <Link href="/start">Create your website <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <a
              href="mailto:hello@site9.in"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="h-4 w-4" /> hello@site9.in
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/site9-logo.png" alt="Site9 — One Website for Every Business" className="h-9 w-auto" />
          <p className="text-sm text-muted-foreground">One Website for Every Business. Open source on GitHub.</p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/vasmikrishna/site9"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid="footer-github-link"
              aria-label="GitHub repository"
            >
              <GitHubIcon className="h-4 w-4" />
            </a>
            <a
              href="mailto:hello@site9.in"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              hello@site9.in
            </a>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
