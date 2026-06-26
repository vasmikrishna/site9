export const dynamic = "force-dynamic"
import { Card, CardContent } from "@/components/ui/card"
import type { CustomPage } from "@/types"
import { PagesAdmin } from "./pages-admin"
import { PagesList } from "./pages-list"

async function getPages(): Promise<CustomPage[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const { getCurrentTenant } = await import("@/lib/tenant")
    const supabase = createClient()
    const tenant = await getCurrentTenant().catch(() => null)
    let query = supabase.from("custom_pages").select("*").order("updated_at", { ascending: false })
    if (tenant?.id) query = query.eq("tenant_id", tenant.id)
    const { data } = await query
    return (data as CustomPage[]) ?? []
  } catch {
    return []
  }
}

export default async function AdminPagesListPage() {
  const pages = await getPages()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pages</h1>
          <p className="text-muted-foreground mt-1">Build and publish custom HTML pages</p>
        </div>
        <PagesAdmin />
      </div>

      {pages.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No pages yet — create your first one above.
          </CardContent>
        </Card>
      ) : (
        <PagesList pages={pages} />
      )}
    </div>
  )
}
