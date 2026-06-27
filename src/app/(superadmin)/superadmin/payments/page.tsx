export const dynamic = "force-dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard } from "lucide-react"
import { getPlatformData, formatPaise } from "@/lib/superadmin-data"
import { PaymentsList } from "./payments-list"

export default async function SuperAdminPaymentsPage() {
  const { payments, totals } = await getPlatformData()
  const paidCount = payments.filter((p) => p.status === "paid").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-muted-foreground mt-1">Every Razorpay charge across all sites</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total revenue</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{formatPaise(totals.revenuePaise)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Paid invoices</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{paidCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Active subscriptions</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-green-500">{totals.activeSubs}</p></CardContent>
        </Card>
      </div>

      {payments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <CreditCard className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">No payments recorded yet</p>
            <p className="text-muted-foreground/70 text-xs mt-1">Charges appear here as soon as a customer subscribes via Razorpay.</p>
          </CardContent>
        </Card>
      ) : (
        <PaymentsList payments={payments} />
      )}
    </div>
  )
}
