export const dynamic = "force-dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, Globe } from "lucide-react"
import { getPlatformData, formatPaise } from "@/lib/superadmin-data"

export default async function SuperAdminDashboard() {
  const { tenants, totals } = await getPlatformData()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Platform Overview</h1>
          <p className="text-muted-foreground mt-1">Everything on Site9 at a glance</p>
        </div>
        <Button asChild variant="brand">
          <Link href="/superadmin/tenants/new"><Plus className="h-4 w-4" /> New Site</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Sites</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{totals.tenants}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Users</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{totals.users}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Active subscriptions</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-green-500">{totals.activeSubs}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Revenue</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{formatPaise(totals.revenuePaise)}</p></CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recent sites</h2>
          <Link href="/superadmin/tenants" className="text-sm text-muted-foreground hover:text-foreground">View all →</Link>
        </div>
        {tenants.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">No sites yet</CardContent>
          </Card>
        ) : (
          tenants.slice(0, 8).map((t) => (
            <Card key={t.id} className="hover:border-foreground/20 transition-colors">
              <CardContent className="flex items-center justify-between py-4 px-5">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: t.primary_color }}>
                    {t.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{t.name}</span>
                      <Badge variant={t.status === "active" ? "success" : "destructive"}>{t.status}</Badge>
                      {t.subStatus && <Badge variant="outline" className="capitalize">{t.subPlan ?? "pro"}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      <span className="font-mono">{t.slug}.site9.in</span>
                      <span className="mx-2">·</span>
                      <span>{t.ownerEmail ?? "no owner"}</span>
                      {t.paidPaise > 0 && (<><span className="mx-2">·</span><span className="text-foreground">{formatPaise(t.paidPaise)} paid</span></>)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 ml-4">
                  <Button variant="ghost" size="sm" asChild>
                    <a href={`https://${t.slug}.site9.in`} target="_blank" rel="noreferrer"><Globe className="h-4 w-4" /></a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/superadmin/tenants/${t.id}`}>Manage</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
