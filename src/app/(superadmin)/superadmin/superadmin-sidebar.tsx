"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Building2, LayoutGrid, LayoutTemplate, Globe, Palette,
  Users, CreditCard, LogOut, Menu, X,
} from "lucide-react"

const NAV: { href: string; label: string; icon: React.ElementType }[] = [
  { href: "/superadmin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/superadmin/users", label: "Users", icon: Users },
  { href: "/superadmin/tenants", label: "Sites", icon: Building2 },
  { href: "/superadmin/payments", label: "Payments", icon: CreditCard },
]
const BUILDER_NAV: { href: string; label: string; icon: React.ElementType }[] = [
  { href: "/superadmin/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/superadmin/sections", label: "Sections", icon: LayoutGrid },
  { href: "/superadmin/reference-sites", label: "Reference Sites", icon: Globe },
  { href: "/superadmin/palettes", label: "Palettes", icon: Palette },
]

export function SuperAdminSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  // Close the drawer on navigation.
  useEffect(() => { setOpen(false) }, [pathname])

  const isActive = (href: string) =>
    pathname === href || (href !== "/superadmin" && pathname.startsWith(href))

  const NavLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) => (
    <Link
      href={href}
      onClick={() => setOpen(false)}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors",
        isActive(href) ? "bg-foreground text-background" : "hover:bg-muted"
      )}
    >
      <Icon className="h-4 w-4" /> {label}
    </Link>
  )

  return (
    <>
      {/* Mobile top bar — hidden on md+ where the static sidebar shows. */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center gap-3 border-b bg-background px-4">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          data-testid="superadmin-sidebar-open"
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="leading-tight">
          <span className="font-bold">Site9</span>
          <span className="ml-2 text-xs text-muted-foreground">Super Admin</span>
        </div>
      </header>

      {/* Backdrop (mobile, when open). */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "w-56 shrink-0 border-r bg-background flex flex-col",
          "fixed inset-y-0 left-0 z-50 transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
          "md:sticky md:top-0 md:z-auto md:h-screen md:translate-x-0"
        )}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div>
            <p className="font-bold text-lg">Site9</p>
            <p className="text-xs text-muted-foreground">Super Admin</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            data-testid="superadmin-sidebar-close"
            className="md:hidden p-2 -mr-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => <NavLink key={item.href} {...item} />)}
          <p className="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Builder Content</p>
          {BUILDER_NAV.map((item) => <NavLink key={item.href} {...item} />)}
        </nav>
        <div className="px-3 py-4 border-t">
          <form action="/api/auth/logout" method="POST">
            <button className="flex w-full items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
