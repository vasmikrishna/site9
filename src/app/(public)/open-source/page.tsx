import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  Check,
  Code2,
  GitPullRequest,
  BookOpen,
  Bug,
  Heart,
  Globe,
  Shield,
  Users,
  Terminal,
  Layers,
  Database,
  Palette,
} from "lucide-react"
import { getSiteSettings } from "@/lib/site-settings"

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  const siteName = settings.site_name ?? "Site9"
  const description = `${siteName} is fully open source. Browse the code, report issues, suggest features, or contribute directly.`
  return {
    title: "Open Source",
    description,
    alternates: { canonical: "/open-source" },
    openGraph: { title: `Open Source | ${siteName}`, description },
  }
}

const WAYS_TO_CONTRIBUTE = [
  {
    icon: Palette,
    title: "Templates",
    desc: "Design and contribute website templates for different industries and visual styles.",
  },
  {
    icon: Code2,
    title: "Features",
    desc: "Build new capabilities — SEO tools, analytics, integrations, page builder improvements.",
  },
  {
    icon: Bug,
    title: "Bug fixes",
    desc: "Find and fix bugs to make Site9 more reliable for every business owner.",
  },
  {
    icon: BookOpen,
    title: "Documentation",
    desc: "Improve guides, tutorials, and API docs to help others get started and self-host.",
  },
]

const TECH_STACK = [
  { icon: Layers, label: "Next.js 16", desc: "App Router, Turbopack, TypeScript strict" },
  { icon: Palette, label: "Tailwind + shadcn/ui", desc: "Modern, accessible component library" },
  { icon: Database, label: "Supabase", desc: "Postgres database, free tier works" },
  { icon: Shield, label: "Custom auth", desc: "JWT via jose, HTTP-only cookies, bcrypt" },
]

const WHY_OPEN_SOURCE = [
  {
    icon: Globe,
    title: "Transparency",
    desc: "Every line of code is public. You can see exactly how Site9 works, audit it, and trust it with your business.",
  },
  {
    icon: Users,
    title: "Community",
    desc: "Great software is built together. Contributors from anywhere can improve Site9 for businesses everywhere.",
  },
  {
    icon: Heart,
    title: "Accessibility",
    desc: "Open source means anyone can self-host Site9 for free. No vendor lock-in, no hidden costs, no surprises.",
  },
  {
    icon: Shield,
    title: "Security",
    desc: "Open code means more eyes catching vulnerabilities. Security through transparency, not obscurity.",
  },
]

export default async function OpenSourcePage() {
  const settings = await getSiteSettings()
  const siteName = settings.site_name ?? "Site9"

  return (
    <>
      {/* Hero */}
      <section style={{ background: "var(--site-primary)" }} className="text-white py-14 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-4">
            <GitHubIcon className="h-8 w-8" />
            <span className="text-sm font-medium bg-white/15 rounded-full px-3 py-1">MIT License</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold">{siteName} is open source</h1>
          <p className="mt-4 text-white/80 max-w-2xl text-lg leading-relaxed">
            Every line of code behind {siteName} is public on GitHub. Browse it, fork it, self-host it, or
            contribute to make it better for every business.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-8">
            <a
              href="https://github.com/vasmikrishna/site9"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ color: "var(--site-primary)" }}
              data-testid="oss-hero-github"
            >
              <GitHubIcon className="h-4 w-4" /> View on GitHub <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="https://github.com/vasmikrishna/site9/blob/main/CONTRIBUTING.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              data-testid="oss-hero-contributing"
            >
              Contributing guide
            </a>
          </div>
        </div>
      </section>

      {/* Why Open Source */}
      <section className="py-16 sm:py-20" style={{ background: "var(--site-bg)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold" style={{ color: "var(--site-primary)" }}>
              Why open source?
            </h2>
            <p className="mt-2 text-gray-500 max-w-2xl mx-auto">
              We believe the software that powers small businesses should be open, trustworthy, and community-driven.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {WHY_OPEN_SOURCE.map((item, i) => (
              <div
                key={i}
                className="flex gap-4 p-6 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-shadow"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: "var(--site-primary)", color: "#fff" }}
                >
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1" style={{ color: "var(--site-primary)" }}>
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Contribute */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold" style={{ color: "var(--site-primary)" }}>
              How to contribute
            </h2>
            <p className="mt-2 text-gray-500 max-w-2xl mx-auto">
              Whether you write code, design templates, fix bugs, or improve docs — every contribution helps
              small businesses get online.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {WAYS_TO_CONTRIBUTE.map((item, i) => (
              <div
                key={i}
                className="p-6 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-shadow"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg mb-4"
                  style={{ background: "var(--site-accent)", color: "#fff" }}
                >
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold mb-2" style={{ color: "var(--site-primary)" }}>
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Getting Started */}
      <section className="py-16 sm:py-20" style={{ background: "var(--site-bg)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl font-bold mb-4" style={{ color: "var(--site-primary)" }}>
                Get started in 5 minutes
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                Fork the repo, install dependencies, and start the dev server. {siteName} runs on the free
                tiers of all its dependencies — no paid accounts needed to contribute.
              </p>
              <div className="space-y-3">
                {[
                  "Fork and clone the repository",
                  "Run pnpm install",
                  "Copy social.env.example to .env.local",
                  "Add your Supabase keys (free tier)",
                  "Run pnpm dev and open localhost:3000",
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-700">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: "var(--site-accent)" }}
                    >
                      {i + 1}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
              <a
                href="https://github.com/vasmikrishna/site9/blob/main/CONTRIBUTING.md#getting-started"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-6 text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: "var(--site-primary)" }}
                data-testid="oss-setup-guide"
              >
                Full setup guide <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-900 text-gray-100 p-6 font-mono text-sm leading-relaxed overflow-x-auto">
              <div className="flex items-center gap-2 text-gray-400 mb-4">
                <Terminal className="h-4 w-4" />
                <span className="text-xs">Terminal</span>
              </div>
              <pre className="whitespace-pre-wrap">
{`git clone https://github.com/YOUR_USERNAME/site9.git
cd site9
pnpm install
cp social.env.example .env.local
# add your Supabase keys
pnpm dev`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold" style={{ color: "var(--site-primary)" }}>
              Built with modern tools
            </h2>
            <p className="mt-2 text-gray-500">
              A clean, well-documented codebase that&apos;s easy to understand and extend.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TECH_STACK.map((item, i) => (
              <div key={i} className="p-5 rounded-lg border border-gray-200 bg-white text-center">
                <item.icon className="h-6 w-6 mx-auto mb-3" style={{ color: "var(--site-primary)" }} />
                <h3 className="font-semibold text-sm" style={{ color: "var(--site-primary)" }}>
                  {item.label}
                </h3>
                <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="py-16 sm:py-20" style={{ background: "var(--site-bg)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold" style={{ color: "var(--site-primary)" }}>
              Contribution workflow
            </h2>
            <p className="mt-2 text-gray-500">
              A simple, consistent process for every contribution.
            </p>
          </div>
          <div className="grid md:grid-cols-5 gap-4">
            {[
              { step: "1", title: "Open an issue", desc: "Describe the bug or feature" },
              { step: "2", title: "Create a branch", desc: "fix/ or feature/ + issue number" },
              { step: "3", title: "Make changes", desc: "Follow coding standards" },
              { step: "4", title: "Open a PR", desc: "Link the issue, describe changes" },
              { step: "5", title: "Get merged", desc: "A maintainer reviews and merges" },
            ].map((item, i) => (
              <div key={i} className="text-center p-4">
                <div
                  className="flex h-10 w-10 mx-auto items-center justify-center rounded-full text-sm font-bold text-white mb-3"
                  style={{ background: "var(--site-primary)" }}
                >
                  {item.step}
                </div>
                <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Project Structure */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl font-bold mb-4" style={{ color: "var(--site-primary)" }}>
                Well-organized codebase
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                The project follows Next.js App Router conventions with clear route groups for each portal.
                Components, utilities, and types are separated into their own directories.
              </p>
              <div className="space-y-2">
                {[
                  "100+ templates across 8 style families",
                  "Visual page builder with drag-and-drop",
                  "Multi-tenant with subdomain routing",
                  "Shop, bookings, blog, and surveys",
                  "Admin, client, and employee portals",
                  "Social media management",
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="h-4 w-4 shrink-0" style={{ color: "var(--site-accent)" }} />
                    {feat}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-900 text-gray-100 p-6 font-mono text-xs leading-relaxed overflow-x-auto">
              <pre className="whitespace-pre-wrap">
{`src/app/
├── (public)/      # marketing + tenant modules
├── (auth)/        # login, register, onboarding
├── (build)/       # visual page builder
├── (admin)/       # tenant admin portal
├── (client)/      # client portal
├── (employee)/    # employee portal
├── (superadmin)/  # platform admin
├── templates/     # template gallery
└── api/           # all API routes`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Contributors */}
      <section className="py-16 sm:py-20" style={{ background: "var(--site-bg)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold" style={{ color: "var(--site-primary)" }}>
              Contributors
            </h2>
            <p className="mt-2 text-gray-500 max-w-2xl mx-auto">
              The people building {siteName}. Join us — your spot is waiting.
            </p>
          </div>

          {/* Hierarchical tree */}
          <div className="flex flex-col items-center">
            {/* Root — Maintainer */}
            <a
              href="https://github.com/vasmikrishna"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 bg-white hover:shadow-lg transition-shadow w-52"
              style={{ borderColor: "var(--site-primary)" }}
              data-testid="contributor-vasmikrishna"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://avatars.githubusercontent.com/u/109943834?v=4"
                alt="VK Reddy"
                className="h-24 w-24 rounded-full border-3"
                style={{ borderColor: "var(--site-primary)" }}
              />
              <div className="text-center">
                <span
                  className="inline-block text-[10px] font-semibold rounded-full px-3 py-1 text-white mb-1.5"
                  style={{ background: "var(--site-primary)" }}
                >
                  Maintainer
                </span>
                <p className="font-bold text-sm" style={{ color: "var(--site-primary)" }}>
                  VK Reddy
                </p>
                <p className="text-xs text-gray-400">@vasmikrishna</p>
              </div>
            </a>

            {/* Vertical connector from maintainer */}
            <div className="w-px h-10" style={{ background: "var(--site-primary)" }} />

            {/* Horizontal connector bar */}
            <div className="relative w-full max-w-xl">
              <div className="h-px" style={{ background: "var(--site-primary)" }} />
              {/* Vertical drop lines from the horizontal bar */}
              <div className="absolute top-0 left-[10%] w-px h-8" style={{ background: "var(--site-primary)" }} />
              <div className="absolute top-0 left-[30%] w-px h-8" style={{ background: "var(--site-primary)" }} />
              <div className="absolute top-0 left-1/2 -translate-x-px w-px h-8" style={{ background: "var(--site-primary)" }} />
              <div className="absolute top-0 left-[70%] w-px h-8" style={{ background: "var(--site-primary)" }} />
              <div className="absolute top-0 left-[90%] w-px h-8" style={{ background: "var(--site-primary)" }} />
            </div>

            {/* Contributor slots */}
            <div className="grid grid-cols-5 gap-4 mt-8 w-full max-w-xl">
              {[
                { area: "Templates", icon: Palette },
                { area: "Features", icon: Code2 },
                { area: "Bug Fixes", icon: Bug },
                { area: "Docs", icon: BookOpen },
                { area: "Community", icon: Heart },
              ].map((slot) => (
                <div
                  key={slot.area}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors bg-gray-50/50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-gray-300">
                    <slot.icon className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-medium text-gray-500">{slot.area}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Could be you</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-gray-400 mt-10">
            Contribute to {siteName} and see your name on the tree.{" "}
            <a
              href="https://github.com/vasmikrishna/site9/blob/main/CONTRIBUTING.md"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-600 transition-colors"
            >
              See how to get started
            </a>
          </p>
        </div>
      </section>

      {/* License */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <Shield className="h-10 w-10 mx-auto mb-4" style={{ color: "var(--site-primary)" }} />
          <h2 className="text-3xl font-bold mb-3" style={{ color: "var(--site-primary)" }}>
            MIT License
          </h2>
          <p className="text-gray-600 leading-relaxed max-w-xl mx-auto">
            {siteName} is licensed under the MIT License. Use it, modify it, distribute it — for personal
            projects, startups, or enterprise. No restrictions, no royalties, no strings attached.
          </p>
          <a
            href="https://github.com/vasmikrishna/site9/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: "var(--site-primary)" }}
            data-testid="oss-license-link"
          >
            Read the full license <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "var(--site-accent)" }} className="py-12 text-white text-center">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold">Join the community</h2>
          <p className="mt-2 text-white/85">
            Star the repo, open an issue, submit a PR, or just say hello. Every contribution matters.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
            <a
              href="https://github.com/vasmikrishna/site9"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded bg-white px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ color: "var(--site-accent)" }}
              data-testid="oss-cta-github"
            >
              <GitHubIcon className="h-4 w-4" /> Star on GitHub
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              data-testid="oss-cta-contact"
            >
              Get in touch <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
