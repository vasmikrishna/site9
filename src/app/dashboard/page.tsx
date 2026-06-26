import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getSitesForEmail } from "@/lib/sites"
import { SitesDashboard } from "@/components/dashboard/sites-dashboard"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  // Super-admin manages the platform, not personal sites.
  if (session.id === "admin") redirect("/superadmin")

  const sites = await getSitesForEmail(session.email)

  return (
    <SitesDashboard
      sites={sites}
      userName={session.name || session.email}
      userEmail={session.email}
    />
  )
}
