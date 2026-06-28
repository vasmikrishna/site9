"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Mobile-only menu. Desktop uses the inline nav in MarketingHeader; below the
 * `md` breakpoint that nav is hidden, so this hamburger surfaces the same links
 * plus the auth actions in a toggled panel. */
export function MobileNav({
  navLinks,
}: {
  navLinks: { href: string; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground transition-colors p-1"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        data-testid="mobile-nav-toggle"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-16 border-b border-border bg-background/95 backdrop-blur px-6 py-4 flex flex-col gap-1"
          data-testid="mobile-nav-panel"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={close}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-border">
            <Button asChild variant="ghost" size="sm" className="w-full justify-start">
              <Link href="/login" onClick={close}>Sign in</Link>
            </Button>
            <Button asChild variant="brand" size="sm" className="w-full">
              <Link href="/start" onClick={close}>Get started</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
