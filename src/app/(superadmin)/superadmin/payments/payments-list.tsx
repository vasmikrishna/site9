"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { PaginatedList } from "@/components/paginated-list"
import { formatPaise, type SAPayment } from "@/lib/superadmin-data"

const STATUS_VARIANT: Record<string, "success" | "destructive" | "warning"> = {
  paid: "success",
  failed: "destructive",
  issued: "warning",
}

export function PaymentsList({ payments }: { payments: SAPayment[] }) {
  return (
    <PaginatedList
      items={payments}
      pageSize={15}
      searchPlaceholder="Search by site, email, or status..."
      testId="payments"
      searchText={(p: SAPayment) => `${p.tenantName} ${p.ownerEmail ?? ""} ${p.status} ${p.plan ?? ""}`}
    >
      {(pagePayments) => (
        <div className="space-y-2">
          {pagePayments.map((p) => (
            <Card key={p.id} className="hover:border-foreground/20 transition-colors">
              <CardContent className="flex items-center justify-between py-3.5 px-5 gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{p.tenantName}</span>
                    <Badge variant={STATUS_VARIANT[p.status] ?? "outline"} className="capitalize">{p.status}</Badge>
                    {p.plan && <Badge variant="outline" className="capitalize">{p.plan}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                    <span className="truncate">{p.ownerEmail ?? "—"}</span>
                    <span>·</span>
                    <span>{p.paidAt ? formatDate(p.paidAt) : "—"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-lg font-bold tabular-nums">{formatPaise(p.amount, p.currency)}</span>
                  {p.invoiceUrl && (
                    <a href={p.invoiceUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" title="View invoice">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PaginatedList>
  )
}
