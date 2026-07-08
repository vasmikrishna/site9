"use client"

import { useState, useEffect } from "react"
import { Loader2, ExternalLink, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { formatDate } from "@/lib/utils"
import { useRazorpayCheckout } from "@/hooks/use-razorpay-checkout"
import type { SubscriptionStatus } from "@/lib/subscription"
import type { SubscriptionInvoice } from "@/lib/subscription"

type Tier = "pro" | "max"
type Period = "monthly" | "yearly"
type PlanKey = `${Tier}_${Period}`

interface TierPrice {
  price: string
  original: string
}

interface TierInfo {
  label: string
  monthly: TierPrice
  yearly: TierPrice
}

const TIERS: Record<Tier, TierInfo> = {
  pro: {
    label: "Pro",
    monthly: { price: "₹99", original: "₹199" },
    yearly: { price: "₹990", original: "₹1,188" },
  },
  max: {
    label: "Max",
    monthly: { price: "₹299", original: "₹499" },
    yearly: { price: "₹2,990", original: "₹3,588" },
  },
}

/** Split a stored plan key ("pro_yearly") into tier + period; tolerant of legacy values. */
function parsePlanKey(key: string | null | undefined): { tier: Tier; period: Period } | null {
  if (!key) return null
  const [tier, period] = key.split("_")
  if ((tier === "pro" || tier === "max") && (period === "monthly" || period === "yearly")) {
    return { tier, period }
  }
  return null
}

function PeriodToggle({
  value,
  onChange,
  disabled,
}: {
  value: Period
  onChange: (p: Period) => void
  disabled?: boolean
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border bg-muted/40 p-1" role="tablist" aria-label="Billing period">
      {(["monthly", "yearly"] as const).map((p) => (
        <button
          key={p}
          type="button"
          role="tab"
          aria-selected={value === p}
          disabled={disabled}
          onClick={() => onChange(p)}
          data-testid={`billing-period-${p}`}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
            value === p ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {p === "monthly" ? "Monthly" : "Yearly"}
          {p === "yearly" && (
            <span className="rounded-full bg-green-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">
              2 months free
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

interface BillingClientProps {
  initialStatus: SubscriptionStatus | null
}

export function BillingClient({ initialStatus }: BillingClientProps) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(initialStatus)
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([])
  const [loading, setLoading] = useState(!initialStatus)
  const [error, setError] = useState("")
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [changingPlan, setChangingPlan] = useState<string | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<Period>("monthly")
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null)
  const startCheckout = useRazorpayCheckout()

  // Fetch status and invoices on mount or when initialStatus changes
  useEffect(() => {
    async function fetchData() {
      try {
        setError("")
        const [statusRes, invoicesRes] = await Promise.all([
          fetch("/api/billing/status"),
          fetch("/api/billing/invoices"),
        ])

        if (statusRes.ok) {
          const statusData = await statusRes.json()
          setStatus(statusData)
        } else {
          setError("Could not load subscription status")
        }

        if (invoicesRes.ok) {
          const invoicesData = await invoicesRes.json()
          setInvoices(invoicesData.invoices || [])
        }
      } catch {
        setError("Failed to load billing information")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  async function handleChangePlan(plan: PlanKey) {
    setError("")
    setChangingPlan(plan)
    try {
      const res = await fetch("/api/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "Could not change plan")
        setChangingPlan(null)
        return
      }

      // Dev fallback: no Razorpay keys, unlocked inline
      if (data.dev) {
        // Refetch status to reflect the change
        const statusRes = await fetch("/api/billing/status")
        if (statusRes.ok) {
          const newStatus = await statusRes.json()
          setStatus(newStatus)
        }
        setChangingPlan(null)
        return
      }

      // Open Razorpay checkout
      await startCheckout({
        subscriptionId: data.subscriptionId,
        keyId: data.keyId,
        name: data.name,
        email: data.email,
        description: `${data.planLabel} plan — ${data.priceLabel}`,
        onSuccess: async () => {
          // Refetch status after successful payment
          const statusRes = await fetch("/api/billing/status")
          if (statusRes.ok) {
            const newStatus = await statusRes.json()
            setStatus(newStatus)
          }
          setChangingPlan(null)
        },
        onError: (msg) => {
          setError(msg)
          setChangingPlan(null)
        },
      })
    } catch {
      setError("Something went wrong. Please try again.")
      setChangingPlan(null)
    }
  }

  async function handleCancel() {
    setCancelLoading(true)
    setError("")
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Could not cancel subscription")
        setCancelLoading(false)
        return
      }

      // Refetch status
      const statusRes = await fetch("/api/billing/status")
      if (statusRes.ok) {
        const newStatus = await statusRes.json()
        setStatus(newStatus)
      }

      setCancelDialogOpen(false)
      setCancelLoading(false)
    } catch {
      setError("Failed to cancel subscription")
      setCancelLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const currentParsed = parsePlanKey(status?.plan)
  const currentPlan = currentParsed
    ? { ...TIERS[currentParsed.tier], period: currentParsed.period }
    : null
  const isActive = status?.active ?? false
  const canCancel = isActive && !status?.cancelAtPeriodEnd

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-sm text-destructive" data-testid="billing-error">
            {error}
          </p>
        </div>
      )}

      {/* CURRENT PLAN CARD */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isActive && currentPlan ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{currentPlan.label}</p>
                  <p className="text-2xl font-bold mt-1">{currentPlan[currentPlan.period].price}</p>
                  <p className="text-sm text-muted-foreground">{currentPlan.period === "yearly" ? "/year" : "/month"}</p>
                </div>
                <Badge variant="success" data-testid="billing-status-active">
                  Active
                </Badge>
              </div>

              <div className="border-t pt-4">
                {status?.cancelAtPeriodEnd ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Cancels on</p>
                    <p className="font-medium" data-testid="billing-cancel-date">
                      {status.currentEnd ? formatDate(status.currentEnd) : "—"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Renews on</p>
                    <p className="font-medium" data-testid="billing-renewal-date">
                      {status?.currentEnd ? formatDate(status.currentEnd) : "—"}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Change plan</span>
                  <PeriodToggle value={billingPeriod} onChange={setBillingPeriod} disabled={changingPlan !== null} />
                </div>
                <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={changingPlan !== null}
                  onClick={() => handleChangePlan(`pro_${billingPeriod}`)}
                  data-testid="billing-change-pro"
                >
                  {changingPlan === `pro_${billingPeriod}` && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Pro — {TIERS.pro[billingPeriod].price}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={changingPlan !== null}
                  onClick={() => handleChangePlan(`max_${billingPeriod}`)}
                  data-testid="billing-change-max"
                >
                  {changingPlan === `max_${billingPeriod}` && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Max — {TIERS.max[billingPeriod].price}
                </Button>
                {canCancel && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setCancelDialogOpen(true)}
                    data-testid="billing-cancel"
                  >
                    Cancel
                  </Button>
                )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  No active subscription. Pick a plan to unlock Pro features.
                </p>
                <PeriodToggle value={billingPeriod} onChange={setBillingPeriod} disabled={changingPlan !== null} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 items-stretch">
                {/* Pro */}
                <button
                  type="button"
                  onClick={() => setSelectedTier("pro")}
                  disabled={changingPlan !== null}
                  aria-pressed={selectedTier === "pro"}
                  data-testid="billing-select-pro"
                  className={`flex flex-col items-start rounded-lg border p-5 text-left transition-all disabled:opacity-60 ${
                    selectedTier === "pro"
                      ? "border-brand ring-2 ring-brand shadow-sm"
                      : "hover:border-brand/50 hover:shadow-sm"
                  }`}
                >
                  <p className="font-medium">Pro</p>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-base text-muted-foreground line-through">{TIERS.pro[billingPeriod].original}</span>
                    <span className="text-3xl font-bold">{TIERS.pro[billingPeriod].price}</span>
                    <span className="text-sm text-muted-foreground">{billingPeriod === "yearly" ? "/year" : "/month"}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Up to 5 websites · all core features.
                  </p>
                </button>

                {/* Max */}
                <button
                  type="button"
                  onClick={() => setSelectedTier("max")}
                  disabled={changingPlan !== null}
                  aria-pressed={selectedTier === "max"}
                  data-testid="billing-select-max"
                  className={`relative flex flex-col items-start rounded-lg border p-5 text-left shadow-sm transition-all disabled:opacity-60 ${
                    selectedTier === "max"
                      ? "border-brand ring-2 ring-brand"
                      : "border-foreground hover:border-brand/60"
                  }`}
                >
                  <Badge variant="brand" className="absolute top-3 right-3">
                    Best value
                  </Badge>
                  <p className="font-medium">Max</p>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-base text-muted-foreground line-through">{TIERS.max[billingPeriod].original}</span>
                    <span className="text-3xl font-bold">{TIERS.max[billingPeriod].price}</span>
                    <span className="text-sm text-muted-foreground">{billingPeriod === "yearly" ? "/year" : "/month"}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Up to 20 websites · all features + priority support.
                  </p>
                </button>
              </div>

              {selectedTier && (
                <Button
                  className="w-full"
                  variant="brand"
                  onClick={() => handleChangePlan(`${selectedTier}_${billingPeriod}`)}
                  disabled={changingPlan !== null}
                  data-testid="billing-checkout"
                >
                  {changingPlan !== null && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Checkout
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* INVOICES CARD */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No invoices yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Period End
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b" data-testid="billing-invoice-row">
                      <td className="py-3 px-4 font-medium">
                        ₹{(invoice.amount / 100).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={invoice.status === "paid" ? "success" : "default"}
                          className="capitalize"
                        >
                          {invoice.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {invoice.period_end ? formatDate(invoice.period_end) : "—"}
                      </td>
                      <td className="py-3 px-4">
                        {invoice.invoice_url ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            data-testid={`billing-invoice-link-${invoice.id}`}
                          >
                            <a
                              href={invoice.invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1"
                            >
                              Receipt
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CANCEL CONFIRMATION DIALOG */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent data-testid="billing-cancel-dialog">
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Your subscription will remain active until the end of the current billing period.
              You can resubscribe anytime.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancelLoading}
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelLoading}
              data-testid="billing-cancel-confirm"
            >
              {cancelLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cancel Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
