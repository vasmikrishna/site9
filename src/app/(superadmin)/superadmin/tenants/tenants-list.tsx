"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { User, Globe } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { PaginatedList } from "@/components/paginated-list"
import { formatPaise } from "@/lib/superadmin-data"

const INDUSTRY_LABELS: Record<string, string> = {
  software: "Software / Tech",
  real_estate: "Real Estate",
  healthcare: "Healthcare",
  legal: "Legal / Law",
  marketing: "Marketing / Creative",
  ecommerce: "E-commerce",
  education: "Education",
  hospitality: "Hospitality",
  finance: "Finance / Accounting",
  construction: "Construction",
  fitness: "Fitness / Wellness",
  consulting: "Consulting",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TenantsList({ tenants }: { tenants: any[] }) {
  return (
    <PaginatedList
      items={tenants}
      pageSize={10}
      searchPlaceholder="Search tenants by name, subdomain, or industry..."
      testId="tenants"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      searchText={(t: any) => `${t.name} ${t.slug} ${t.status} ${t.plan} ${t.ownerEmail ?? ""} ${INDUSTRY_LABELS[t.industry] ?? t.industry}`}
    >
      {(pageTenants) => (
        <div className="space-y-2">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {pageTenants.map((t: any) => (
            <Card key={t.id} className="hover:border-foreground/20 transition-colors">
              <CardContent className="flex items-center justify-between py-4 px-5">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center text-base font-bold text-white shrink-0"
                    style={{ backgroundColor: t.primary_color }}>
                    {t.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{t.name}</span>
                      <Badge variant={t.status === "active" ? "success" : t.status === "suspended" ? "destructive" : "warning"}>
                        {t.status}
                      </Badge>
                      {t.subStatus ? (
                        <Badge variant="success" className="capitalize">{t.subPlan ?? "pro"}</Badge>
                      ) : (
                        <Badge variant="outline">free</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      <span className="font-mono">{t.slug}.site9.in</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />{t.ownerEmail ?? "no owner"}
                      </span>
                      {t.paidPaise > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-foreground font-medium">{formatPaise(t.paidPaise)} paid</span>
                        </>
                      )}
                      <span>·</span>
                      <span>Created {formatDate(t.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 ml-4">
                  <Button variant="ghost" size="sm" asChild>
                    <a href={`https://${t.slug}.site9.in`} target="_blank" rel="noreferrer" title="Open site"><Globe className="h-4 w-4" /></a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/superadmin/tenants/${t.id}`}>Manage</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PaginatedList>
  )
}
