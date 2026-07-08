import Link from "next/link"
import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X as XIcon, Server, Cloud } from "lucide-react"
import { ThemeLogo } from "@/components/ui/theme-logo"
import { MarketingHeader } from "@/components/public/marketing-header"
import { PricingPlans } from "./pricing-plans"
import { FEATURES, SITES } from "./plans-data"

export const metadata: Metadata = {
  title: "Pricing | Site9",
  description: "Build your website in 5 minutes. Free forever (1 website), Pro at ₹99/month for 5 websites, or Max at ₹299/month for 20 websites with priority support.",
  alternates: { canonical: "/pricing" },
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

const NAV_LINKS = [
  { href: "/templates", label: "Templates" },
  { href: "/pricing", label: "Pricing" },
  { href: "/open-source", label: "Open Source" },
  { href: "/#about", label: "About" },
  { href: "/#contact", label: "Contact" },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader navLinks={NAV_LINKS} />

      <section className="py-16 border-b border-border">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <Server className="h-6 w-6 text-green-500" />
                <h2 className="text-2xl font-bold">Self-host for free</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Site9 is fully open source under the Apache 2.0 license. Clone the repo, deploy on your own infrastructure, and run it forever — no cost, no limits, no catch.
              </p>
              <div className="flex items-center gap-3">
                <Button asChild variant="outline" size="sm" data-testid="self-host-github-cta">
                  <a href="https://github.com/vasmikrishna/site9" target="_blank" rel="noopener noreferrer">
                    <GitHubIcon className="h-4 w-4" /> View on GitHub
                  </a>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/open-source">Learn more</Link>
                </Button>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <Cloud className="h-6 w-6 text-blue-500" />
                <h2 className="text-2xl font-bold">Or let us host it</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Don&apos;t want to manage servers? We handle hosting, updates, backups, and security — so you can focus on your business.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-4">
            <Badge variant="brand" className="mb-4">Managed Hosting</Badge>
            <h1 className="text-4xl font-bold tracking-tight">Simple, honest pricing</h1>
            <p className="text-muted-foreground mt-3 text-lg">Three plans. No surprises. Cancel anytime.</p>
          </div>
          <p className="text-center text-sm text-muted-foreground mb-12">Prefer to self-host? It&apos;s free and always will be.</p>

          <PricingPlans />

          {/* Comparison table */}
          <div className="mt-16 max-w-3xl mx-auto">
            <h3 className="text-lg font-bold text-center mb-6">Feature comparison</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium">Feature</th>
                    <th className="text-center py-3 px-4 font-medium w-24">Free</th>
                    <th className="text-center py-3 px-4 font-medium w-24">Pro</th>
                    <th className="text-center py-3 px-4 font-medium w-24">Max</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-4">Websites included</td>
                    <td className="py-3 px-4 text-center font-medium">{SITES.free}</td>
                    <td className="py-3 px-4 text-center font-medium">{SITES.pro}</td>
                    <td className="py-3 px-4 text-center font-medium">{SITES.max}</td>
                  </tr>
                  {FEATURES.map((feat) => (
                    <tr key={feat.label} className="border-b last:border-b-0">
                      <td className="py-3 px-4">{feat.label}</td>
                      <td className="py-3 px-4 text-center">
                        {feat.free
                          ? <Check className="h-4 w-4 text-green-500 mx-auto" />
                          : <XIcon className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                        }
                      </td>
                      <td className="py-3 px-4 text-center">
                        {feat.pro
                          ? <Check className="h-4 w-4 text-green-500 mx-auto" />
                          : <XIcon className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                        }
                      </td>
                      <td className="py-3 px-4 text-center">
                        {feat.max
                          ? <Check className="h-4 w-4 text-green-500 mx-auto" />
                          : <XIcon className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <ThemeLogo className="h-9 w-auto" />
          <p className="text-sm text-muted-foreground">Build your website in 5 minutes. Open source on GitHub.</p>
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
