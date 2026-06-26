import Link from "next/link"
import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Check, Code2, GitPullRequest, BookOpen, Users, Shield, Heart } from "lucide-react"
import { Contributors } from "@/components/public/contributors"

export const metadata: Metadata = {
  title: "Open Source | Site9",
  description: "Site9 is open source. Browse the code, report issues, suggest features, or contribute directly.",
  alternates: { canonical: "/open-source" },
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

const NAV_LINKS = [
  { href: "/#services", label: "Features" },
  { href: "/templates", label: "Templates" },
  { href: "/pricing", label: "Pricing" },
  { href: "/open-source", label: "Open Source" },
  { href: "/#about", label: "About" },
  { href: "/#contact", label: "Contact" },
]

const CONTRIBUTE_AREAS = [
  {
    icon: Code2,
    title: "Templates",
    description: "Design and contribute website templates for different industries and styles.",
  },
  {
    icon: GitPullRequest,
    title: "Features",
    description: "Build new features — SEO tools, analytics, integrations, booking systems, and more.",
  },
  {
    icon: Check,
    title: "Bug Fixes",
    description: "Find and fix bugs to make Site9 more reliable for every business owner.",
    iconColor: "text-green-500",
  },
  {
    icon: BookOpen,
    title: "Documentation",
    description: "Improve guides, tutorials, and API docs to help others get started quickly.",
  },
]

const GUIDELINES = [
  { label: "Fork the repo and create a branch", detail: "fix/issue-number-desc or feature/issue-number-desc" },
  { label: "Every change needs a GitHub issue", detail: "Create one before starting work" },
  { label: "TypeScript strict mode", detail: "No any types, no @ts-ignore" },
  { label: "pnpm only", detail: "Don't commit package-lock.json or yarn.lock" },
  { label: "Tailwind + shadcn/ui", detail: "No custom CSS frameworks" },
  { label: "Interactive elements need data-testid", detail: "For automated testing" },
]

export default function OpenSourcePage() {
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
            <a
              href="https://github.com/vasmikrishna/site9"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
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
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <Badge variant="brand" className="mb-6">Open Source</Badge>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Built in the open
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Site9 is fully open source under the Apache 2.0 license. Browse the code, report issues, suggest features, or contribute directly. Every business deserves great software — and great software is built together.
        </p>
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button asChild variant="brand" size="lg" data-testid="oss-github-cta">
            <a href="https://github.com/vasmikrishna/site9" target="_blank" rel="noopener noreferrer">
              <GitHubIcon className="h-4 w-4" /> View on GitHub <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="https://github.com/vasmikrishna/site9/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer">
              Contributing guide
            </a>
          </Button>
        </div>
      </section>

      {/* Why open source */}
      <section className="bg-muted/40 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-10">Why open source?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 space-y-3">
                <Users className="h-6 w-6 text-muted-foreground" />
                <h3 className="font-semibold">Community-driven</h3>
                <p className="text-sm text-muted-foreground">
                  Anyone can contribute templates, features, and improvements. The best ideas come from the people using the product.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 space-y-3">
                <Shield className="h-6 w-6 text-muted-foreground" />
                <h3 className="font-semibold">Transparent and secure</h3>
                <p className="text-sm text-muted-foreground">
                  Every line of code is auditable. No hidden tracking, no vendor lock-in. You can self-host if you want full control.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 space-y-3">
                <Heart className="h-6 w-6 text-muted-foreground" />
                <h3 className="font-semibold">Free for everyone</h3>
                <p className="text-sm text-muted-foreground">
                  Small businesses shouldn&apos;t need expensive tools to get online. Open source keeps the barrier as low as possible.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How to contribute */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-4">How to contribute</h2>
          <p className="text-muted-foreground text-center mb-10 max-w-xl mx-auto">
            Whether you&apos;re a designer, developer, or writer — there&apos;s a way to help.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {CONTRIBUTE_AREAS.map((area) => (
              <Card key={area.title}>
                <CardContent className="p-6 space-y-3">
                  <area.icon className={`h-6 w-6 ${area.iconColor ?? "text-muted-foreground"}`} />
                  <h3 className="font-semibold">{area.title}</h3>
                  <p className="text-sm text-muted-foreground">{area.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contribution guidelines */}
      <section className="bg-muted/40 py-16">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-10">Contribution guidelines</h2>
          <div className="space-y-4">
            {GUIDELINES.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <Check className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button asChild variant="outline" size="sm">
              <a href="https://github.com/vasmikrishna/site9/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer">
                Read full contributing guide <ArrowRight className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-10">Tech stack</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Next.js 16", detail: "App Router" },
              { name: "TypeScript", detail: "Strict mode" },
              { name: "Tailwind CSS", detail: "v4 + shadcn/ui" },
              { name: "Supabase", detail: "Postgres" },
              { name: "Custom Auth", detail: "JWT + bcrypt" },
              { name: "Stripe", detail: "Payments" },
              { name: "Cloudflare R2", detail: "File storage" },
              { name: "Vercel", detail: "Hosting" },
            ].map((tech) => (
              <Card key={tech.name}>
                <CardContent className="p-4 text-center">
                  <p className="font-semibold text-sm">{tech.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tech.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contributors */}
      <section className="bg-muted/40 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-3">Contributors</h2>
          <p className="text-muted-foreground text-center mb-10">
            The people building Site9. Join us — your spot is waiting.
          </p>
          <Contributors />
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-2xl font-bold">Ready to contribute?</h2>
          <p className="text-muted-foreground">
            Check out the repo, pick an issue labeled &quot;good first issue&quot;, and submit your first PR.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild variant="brand" size="lg">
              <a href="https://github.com/vasmikrishna/site9" target="_blank" rel="noopener noreferrer">
                <GitHubIcon className="h-4 w-4" /> View on GitHub
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="https://github.com/vasmikrishna/site9/issues" target="_blank" rel="noopener noreferrer">
                Browse issues
              </a>
            </Button>
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
