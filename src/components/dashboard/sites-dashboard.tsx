"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import {
  Plus, ExternalLink, Pencil, Settings2, Globe, LogOut, Sparkles, CheckCircle2, Clock, Crown, Lock,
  LayoutGrid, FileText, MessageSquare, Newspaper, Files, ArrowRight,
} from "lucide-react"
import type { AccountSite, AccountPlan, AccountStats } from "@/lib/sites"

const PLAN_LABELS: Record<AccountPlan, string> = { free: "Free", pro: "Pro", business: "Business" }

type Tab = "dashboard" | "sites"

function StatCard({ icon: Icon, value, label, testId }: {
  icon: React.ElementType
  value: number | string
  label: string
  testId: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4" data-testid={testId}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  )
}

export function SitesDashboard({
  sites, userName, userEmail, plan, limit, stats,
}: {
  sites: AccountSite[]
  userName: string
  userEmail: string
  plan: AccountPlan
  limit: number
  stats: AccountStats
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("dashboard")
  const [creating, setCreating] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState("")

  const atLimit = sites.length >= limit
  const published = sites.filter((s) => s.onboarding_complete).length
  const drafts = sites.length - published

  // Upgrades run through a site's existing billing (Razorpay). Use the first site.
  function goUpgrade() {
    if (sites[0]) openSite(sites[0].id, "/admin/billing")
  }

  function startCreate() {
    if (atLimit) { goUpgrade(); return }
    setNewName(""); setShowNew(true)
  }

  async function createSite() {
    setError("")
    setCreating(true)
    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() || "My Site" }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Could not create site")
        if (data.upgrade) { setShowNew(false); goUpgrade() }
        return
      }
      router.push("/build")
    } catch {
      setError("Could not create site")
    } finally {
      setCreating(false)
    }
  }

  // Switch the active site, then go to the chosen destination.
  async function openSite(tenantId: string, dest: string) {
    setBusyId(tenantId)
    try {
      await fetch("/api/sites/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      })
      router.push(dest)
    } finally {
      setBusyId(null)
    }
  }

  async function signOut() {
    try { await fetch("/api/auth/logout", { method: "POST" }) } catch { /* ignore */ }
    window.location.href = "/"
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
    { key: "sites", label: "My sites", icon: Globe },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />
            <span className="text-lg font-bold tracking-tight">Site9</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{userName}</p>
              <p className="text-xs text-muted-foreground leading-tight">{userEmail}</p>
            </div>
            <ThemeToggle />
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
              data-testid="dashboard-signout"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <nav className="-mb-px flex gap-1" data-testid="dashboard-tabs">
            {tabs.map((t) => {
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "border-brand text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`tab-${t.key}`}
                  aria-selected={active}
                >
                  <t.icon className="h-4 w-4" /> {t.label}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {error && (
          <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        {/* ---------------- Dashboard tab ---------------- */}
        {tab === "dashboard" && (
          <div className="space-y-6" data-testid="dashboard-overview">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Welcome back, {(userName.split(" ")[0] || "there")}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">Here&apos;s what&apos;s happening across your sites.</p>
            </div>

            {/* Plan + quota */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <Crown className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-semibold">{PLAN_LABELS[plan]} plan</p>
                  <p className="text-sm text-muted-foreground" data-testid="site-usage">
                    {sites.length} of {limit} site{limit === 1 ? "" : "s"} used
                  </p>
                </div>
              </div>
              {plan !== "business" && (
                <Button variant="outline" onClick={goUpgrade} data-testid="dashboard-upgrade-btn">
                  <Crown className="h-4 w-4" /> Upgrade
                </Button>
              )}
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard icon={Globe} value={sites.length} label="Sites" testId="stat-sites" />
              <StatCard icon={CheckCircle2} value={published} label="Published" testId="stat-published" />
              <StatCard icon={Clock} value={drafts} label="Drafts" testId="stat-drafts" />
              <StatCard icon={MessageSquare} value={stats.enquiries} label="Enquiries" testId="stat-enquiries" />
              <StatCard icon={Files} value={stats.pages} label="Pages" testId="stat-pages" />
              <StatCard icon={Newspaper} value={stats.posts} label="Blog posts" testId="stat-posts" />
            </div>

            {/* Quick actions */}
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quick actions</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <Button variant="outline" className="justify-between" onClick={startCreate} data-testid="quick-new-site">
                  <span className="flex items-center gap-2"><Plus className="h-4 w-4" /> New site</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="justify-between"
                  disabled={!sites[0]}
                  onClick={() => sites[0] && openSite(sites[0].id, "/admin/enquiries")}
                  data-testid="quick-enquiries"
                >
                  <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> View enquiries</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="justify-between"
                  disabled={!sites[0]}
                  onClick={() => sites[0] && openSite(sites[0].id, "/admin/pages")}
                  data-testid="quick-pages"
                >
                  <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Manage pages</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- My sites tab ---------------- */}
        {tab === "sites" && (
          <div data-testid="sites-tab">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">My sites</h1>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs font-medium">
                    <Crown className="h-3 w-3 text-amber-500" /> {PLAN_LABELS[plan]} plan
                  </span>
                  <span>{sites.length} of {limit} site{limit === 1 ? "" : "s"} used</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {atLimit && plan !== "business" && (
                  <Button variant="outline" onClick={goUpgrade} data-testid="upgrade-btn">
                    <Crown className="h-4 w-4" /> Upgrade
                  </Button>
                )}
                <Button
                  variant="brand"
                  disabled={atLimit}
                  onClick={startCreate}
                  data-testid="new-site-btn"
                >
                  {atLimit ? <><Lock className="h-4 w-4" /> Limit reached</> : <><Plus className="h-4 w-4" /> New site</>}
                </Button>
              </div>
            </div>

            {sites.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
                  <Globe className="h-7 w-7 text-brand" />
                </div>
                <h2 className="text-lg font-semibold">No sites yet</h2>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Spin up your first website in minutes — describe it and let AI build it.
                </p>
                <Button variant="brand" className="mt-5" onClick={() => { setNewName(""); setShowNew(true) }} data-testid="new-site-empty">
                  <Plus className="h-4 w-4" /> Create a site
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="sites-grid">
                {sites.map((site) => (
                  <div
                    key={site.id}
                    className="flex flex-col overflow-hidden rounded-xl border border-border bg-card"
                    data-testid={`site-card-${site.id}`}
                  >
                    {/* Banner */}
                    <div className="flex h-20 items-center gap-3 px-4" style={{ background: `linear-gradient(135deg, ${site.primary_color}22, ${site.primary_color}08)` }}>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold" style={{ backgroundColor: site.primary_color }}>
                        {(site.name || "S").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{site.name}</p>
                        <p className="truncate text-xs text-muted-foreground font-mono">{site.custom_domain || site.host}</p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-1.5 px-4 py-2 text-xs">
                      {site.onboarding_complete ? (
                        <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> <span className="text-muted-foreground">Published</span></>
                      ) : (
                        <><Clock className="h-3.5 w-3.5 text-amber-500" /> <span className="text-muted-foreground">Draft</span></>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-auto grid grid-cols-3 gap-1 border-t border-border p-2">
                      <Button size="sm" variant="ghost" className="text-xs" loading={busyId === site.id} onClick={() => openSite(site.id, "/build")} data-testid={`edit-${site.id}`}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => openSite(site.id, "/admin/dashboard")} data-testid={`manage-${site.id}`}>
                        <Settings2 className="h-3.5 w-3.5" /> Manage
                      </Button>
                      <a
                        href={`https://${site.custom_domain || site.host}`}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center justify-center gap-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        data-testid={`view-${site.id}`}
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* New site dialog */}
      <Dialog open={showNew} onOpenChange={(o) => !o && setShowNew(false)}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Create a new site</DialogTitle>
          <div className="space-y-3 pt-2">
            <div>
              <Label htmlFor="site-name">Site name</Label>
              <Input
                id="site-name"
                autoFocus
                placeholder="My Business"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createSite() }}
                data-testid="new-site-name"
              />
              <p className="mt-1 text-xs text-muted-foreground">You can change this and pick a domain later.</p>
            </div>
            <Button variant="brand" className="w-full" loading={creating} onClick={createSite} data-testid="new-site-create">
              <Sparkles className="h-4 w-4" /> Create &amp; build
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
