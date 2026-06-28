import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { SuperAdminSidebar } from "./superadmin-sidebar"

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const SUPER_ADMIN_EMAIL = process.env.ADMIN_EMAIL
  if (!session || session.email !== SUPER_ADMIN_EMAIL) redirect("/login")

  return (
    <div className="flex min-h-screen bg-muted/20">
      <SuperAdminSidebar />
      <main className="flex-1 min-w-0 overflow-auto pt-14 md:pt-0 p-4 sm:p-6 md:p-8">{children}</main>
    </div>
  )
}
