"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { FEATURES } from "@/lib/features"
import {
  LayoutDashboard, LayoutTemplate, Newspaper,
  Mail, LogOut, ChevronRight, Globe,
  Receipt, Menu, X, Sliders
} from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badgeKey?: "enquiries"
}

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Pages", href: "/admin/pages", icon: LayoutTemplate },
  { label: "Blog", href: "/admin/blog", icon: Newspaper },
  { label: "Enquiries", href: "/admin/enquiries", icon: Mail, badgeKey: "enquiries" },
  { label: "Billing", href: "/admin/billing", icon: Receipt },
  { label: "Domain", href: "/admin/config/domain", icon: Globe },
  { label: "Settings", href: "/admin/config/intake", icon: Sliders },
]

interface PortalSidebarProps {
  role: "admin"
  userName: string
  userEmail: string
}

export function PortalSidebar({ role, userName, userEmail }: PortalSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const hiddenHrefs: string[] = [
    ...(FEATURES.pageBuilder ? [] : ["/admin/pages"]),
    ...(FEATURES.blog ? [] : ["/admin/blog"]),
  ]
  const nav = adminNav.filter((item) => !hiddenHrefs.includes(item.href))
  const [newEnquiries, setNewEnquiries] = useState(0)

  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    if (role !== "admin") return
    let cancelled = false
    async function poll() {
      try {
        const res = await fetch("/api/admin/enquiries?status=new")
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setNewEnquiries(data.counts?.new ?? 0)
      } catch { /* ignore */ }
    }
    poll()
    const id = setInterval(poll, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [role, pathname])

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  return (
    <>
      <header className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center gap-3 border-b border-border bg-background px-4">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          data-testid="portal-sidebar-open"
          className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/" className="text-lg font-bold tracking-tight">Site9</Link>
      </header>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          aria-hidden="true"
        />
      )}

    <aside
      className={cn(
        "w-64 flex-shrink-0 border-r border-border flex flex-col bg-background",
        "fixed inset-y-0 left-0 z-50 transition-transform duration-200",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        "md:sticky md:top-0 md:z-auto md:h-screen md:translate-x-0"
      )}
    >
      <button
        onClick={() => setMobileOpen(false)}
        aria-label="Close menu"
        data-testid="portal-sidebar-close"
        className="md:hidden absolute top-3 right-3 p-2 rounded-lg hover:bg-accent transition-colors z-10"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="p-6 border-b border-border">
        <Link href="/" className="text-xl font-bold tracking-tight">Site9</Link>
        <p className="text-xs text-muted-foreground mt-1">Admin</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {nav.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href)
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badgeKey === "enquiries" && newEnquiries > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                  {newEnquiries}
                </span>
              )}
              {active && <ChevronRight className="h-3 w-3" />}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors w-full"
        >
          <LogOut className="h-3 w-3" />
          Sign out
        </button>
      </div>
    </aside>
    </>
  )
}
