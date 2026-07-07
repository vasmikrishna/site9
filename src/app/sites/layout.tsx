import { MarketingHeader } from "@/components/public/marketing-header"
import { MarketingFooter } from "@/components/public/marketing-footer"

const NAV_LINKS = [
  { href: "/templates", label: "Templates" },
  { href: "/pricing", label: "Pricing" },
  { href: "/open-source", label: "Open Source" },
  { href: "/#about", label: "About" },
  { href: "/#contact", label: "Contact" },
]

export default function SitesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <MarketingHeader navLinks={NAV_LINKS} />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  )
}
