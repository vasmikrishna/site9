"use client"

import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, ExternalLink } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { PaginatedList } from "@/components/paginated-list"
import { formatPaise, type SAPayment } from "@/lib/superadmin-data"

const STATUS_VARIANT: Record<string, "success" | "destructive" | "warning"> = {
  paid: "success",
  active: "success",
  failed: "destructive",
  issued: "warning",
  pending: "warning",
}

/** The day portion (YYYY-MM-DD) of an ISO timestamp, for date-range compares. */
const dayOf = (iso: string | null) => (iso ? iso.slice(0, 10) : "")

/** RFC-4180 cell: wrap in quotes and double any embedded quotes. */
const cell = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`

function exportCsv(rows: SAPayment[]) {
  const header = ["Site", "Email", "Phone", "Status", "Plan", "Amount (INR)", "Date"]
  const body = rows.map((p) => [
    cell(p.tenantName),
    cell(p.ownerEmail),
    cell(p.ownerPhone),
    cell(p.status),
    cell(p.plan),
    cell((p.amount ?? 0) / 100),
    cell(p.paidAt ? formatDate(p.paidAt) : ""),
  ].join(","))
  // Leading BOM so Excel reads UTF-8 (₹, names) correctly.
  const csv = "﻿" + [header.map(cell).join(","), ...body].join("\r\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const a = document.createElement("a")
  a.href = url
  a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function PaymentsList({ payments }: { payments: SAPayment[] }) {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const filtered = useMemo(
    () =>
      payments.filter((p) => {
        const d = dayOf(p.paidAt)
        if (from && (!d || d < from)) return false
        if (to && (!d || d > to)) return false
        return true
      }),
    [payments, from, to],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          From
          <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)}
            className="w-[10rem]" data-testid="payments-from" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          To
          <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)}
            className="w-[10rem]" data-testid="payments-to" />
        </label>
        {(from || to) && (
          <Button variant="ghost" size="sm" onClick={() => { setFrom(""); setTo("") }} data-testid="payments-clear-dates">
            Clear
          </Button>
        )}
        <Button variant="outline" size="sm" className="ml-auto gap-2" disabled={filtered.length === 0}
          onClick={() => exportCsv(filtered)} data-testid="payments-export">
          <Download className="h-4 w-4" /> Download Excel
        </Button>
      </div>

      <PaginatedList
        items={filtered}
        pageSize={15}
        searchPlaceholder="Search by site, email, phone, or status..."
        testId="payments"
        searchText={(p: SAPayment) => `${p.tenantName} ${p.ownerEmail ?? ""} ${p.ownerPhone ?? ""} ${p.status} ${p.plan ?? ""}`}
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
                      <span>{p.ownerPhone ?? "No phone"}</span>
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
    </div>
  )
}
