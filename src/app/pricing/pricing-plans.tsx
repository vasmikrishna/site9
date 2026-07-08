"use client"

import { useState } from "react"
import Link from "next/link"
import { trackEvent } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Check } from "lucide-react"
import { FEATURES, SITES } from "./plans-data"

type Period = "monthly" | "yearly"

interface TierPrice {
  price: string
  per: string
  original: string
  note: string
}

const PRICING: Record<"pro" | "max", Record<Period, TierPrice>> = {
  pro: {
    monthly: { price: "₹99", per: "/month", original: "₹199", note: "50% off" },
    yearly: { price: "₹990", per: "/year", original: "₹1,188", note: "2 months free" },
  },
  max: {
    monthly: { price: "₹299", per: "/month", original: "₹499", note: "40% off" },
    yearly: { price: "₹2,990", per: "/year", original: "₹3,588", note: "2 months free" },
  },
}

function PriceBlock({ p, sites }: { p: TierPrice; sites: string }) {
  return (
    <div>
      <span className="text-xl text-muted-foreground line-through mr-1">{p.original}</span>
      <span className="text-4xl font-bold">{p.price}</span>
      <span className="text-muted-foreground text-sm">{p.per}</span>
      <span className="text-green-500 text-xs ml-2 font-medium">{p.note}</span>
      <p className="text-sm font-medium text-foreground mt-1">{sites}</p>
    </div>
  )
}

export function PricingPlans() {
  const [period, setPeriod] = useState<Period>("monthly")

  return (
    <div className="space-y-10">
      {/* Monthly / Yearly toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border bg-muted/40 p-1" role="tablist" aria-label="Billing period">
          <button
            type="button"
            role="tab"
            aria-selected={period === "monthly"}
            onClick={() => setPeriod("monthly")}
            data-testid="pricing-toggle-monthly"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              period === "monthly" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={period === "yearly"}
            onClick={() => setPeriod("yearly")}
            data-testid="pricing-toggle-yearly"
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              period === "yearly" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly
            <span className="rounded-full bg-green-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">2 months free</span>
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
        {/* Free */}
        <Card data-testid="plan-free">
          <CardContent className="p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold">Free</h2>
              <p className="text-sm text-muted-foreground mt-1">Get your business online</p>
            </div>
            <div>
              <span className="text-4xl font-bold">₹0</span>
              <span className="text-muted-foreground text-sm"> forever</span>
              <p className="text-sm font-medium text-foreground mt-1">{SITES.free}</p>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full" data-testid="plan-free-cta">
              <Link href="/start" onClick={() => trackEvent("select_plan", { plan: "free", source: "pricing" })}>Start free <ArrowRight className="h-3 w-3" /></Link>
            </Button>
            <div className="space-y-3 pt-2">
              {FEATURES.filter((f) => f.free).map((feat) => (
                <div key={feat.label} className="flex items-center gap-2 text-sm">
                  <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                  {feat.label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pro */}
        <Card className="border-foreground shadow-lg relative" data-testid="plan-pro">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge variant="brand">Most popular</Badge>
          </div>
          <CardContent className="p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold">Pro</h2>
              <p className="text-sm text-muted-foreground mt-1">Your own brand and domain</p>
            </div>
            <PriceBlock p={PRICING.pro[period]} sites={SITES.pro} />
            <Button asChild variant="brand" size="sm" className="w-full" data-testid="plan-pro-cta">
              <Link href={`/start?plan=pro_${period}`} onClick={() => trackEvent("select_plan", { plan: "pro", period, source: "pricing" })}>Get Pro <ArrowRight className="h-3 w-3" /></Link>
            </Button>
            <div className="space-y-3 pt-2">
              {FEATURES.filter((f) => f.pro).map((feat) => (
                <div key={feat.label} className="flex items-center gap-2 text-sm">
                  <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                  {feat.label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Max */}
        <Card className="relative" data-testid="plan-max">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge variant="brand">Best value</Badge>
          </div>
          <CardContent className="p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold">Max</h2>
              <p className="text-sm text-muted-foreground mt-1">For agencies & power users</p>
            </div>
            <PriceBlock p={PRICING.max[period]} sites={SITES.max} />
            <Button asChild variant="brand" size="sm" className="w-full" data-testid="plan-max-cta">
              <Link href={`/start?plan=max_${period}`} onClick={() => trackEvent("select_plan", { plan: "max", period, source: "pricing" })}>Get Max <ArrowRight className="h-3 w-3" /></Link>
            </Button>
            <div className="space-y-3 pt-2">
              {FEATURES.filter((f) => f.max).map((feat) => (
                <div key={feat.label} className="flex items-center gap-2 text-sm">
                  <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                  {feat.label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
