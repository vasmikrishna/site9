"use client"

import { useState } from "react"
import { Sparkles, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

type Tier = "pro" | "max"
type Period = "monthly" | "yearly"

interface TierPrice {
  price: string
  original: string
  per: string
}

interface PlanCard {
  key: Tier
  label: string
  monthly: TierPrice
  yearly: TierPrice
  blurb: string
  highlight?: boolean
}

const PLAN_CARDS: PlanCard[] = [
  {
    key: "pro",
    label: "Pro",
    monthly: { price: "₹99", original: "₹199", per: "/month" },
    yearly: { price: "₹990", original: "₹1,188", per: "/year" },
    blurb: "Up to 5 websites · all core features.",
  },
  {
    key: "max",
    label: "Max",
    monthly: { price: "₹299", original: "₹499", per: "/month" },
    yearly: { price: "₹2,990", original: "₹3,588", per: "/year" },
    blurb: "Up to 20 websites · all features + priority support.",
    highlight: true,
  },
]

const PERKS = [
  "Remove the Site9 badge from your site",
  "Custom domain (yourbusiness.com)",
  "All 100+ templates & unlimited blog posts",
]

// Minimal shape of the Razorpay Checkout widget we use.
interface RazorpayOptions {
  key: string
  subscription_id: string
  name: string
  description: string
  prefill?: { name?: string; email?: string }
  theme?: { color?: string }
  handler: (resp: RazorpayResponse) => void
  modal?: { ondismiss?: () => void }
}
interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_subscription_id: string
  razorpay_signature: string
}
interface RazorpayConstructor {
  new (options: RazorpayOptions): { open: () => void }
}
declare global {
  interface Window {
    Razorpay?: RazorpayConstructor
  }
}

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js"

function loadRazorpay(): Promise<RazorpayConstructor | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(null)
    if (window.Razorpay) return resolve(window.Razorpay)
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`)
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Razorpay ?? null))
      existing.addEventListener("error", () => resolve(null))
      return
    }
    const script = document.createElement("script")
    script.src = CHECKOUT_SRC
    script.onload = () => resolve(window.Razorpay ?? null)
    script.onerror = () => resolve(null)
    document.body.appendChild(script)
  })
}

/**
 * Soft-upsell banner shown in the builder when the tenant has no active
 * subscription. Publishing is never blocked — this only nudges and, on
 * subscribe, hides itself. Drives Razorpay Checkout end to end.
 */
export function UpgradeBanner({ subscribed }: { subscribed: boolean }) {
  const [active, setActive] = useState(subscribed)
  const [open, setOpen] = useState(false)
  const [period, setPeriod] = useState<Period>("monthly")
  const [selected, setSelected] = useState<Tier | null>(null)
  const [busy, setBusy] = useState<Tier | null>(null)
  const [error, setError] = useState("")

  if (active) return null

  async function handleSubscribe(tier: Tier) {
    setError("")
    setBusy(tier)
    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: `${tier}_${period}` }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "Could not start checkout")
        return
      }

      // Dev fallback: no Razorpay keys, unlocked inline.
      if (data.dev) {
        setActive(true)
        setOpen(false)
        return
      }

      const Razorpay = await loadRazorpay()
      if (!Razorpay) {
        setError("Could not load the payment window. Check your connection.")
        return
      }

      const checkout = new Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: data.name ?? "site9",
        description: `${data.planLabel} plan — ${data.priceLabel}`,
        prefill: { email: data.email },
        theme: { color: "#6d28d9" },
        handler: async (resp) => {
          const verify = await fetch("/api/billing/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(resp),
          })
          if (verify.ok) {
            setActive(true)
            setOpen(false)
          } else {
            setError("Payment captured but could not be verified. Refresh in a moment.")
          }
        },
        modal: { ondismiss: () => setBusy(null) },
      })
      checkout.open()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div
        className="flex items-center justify-between gap-3 border-b border-brand/30 bg-gradient-to-r from-brand/10 to-brand/5 px-4 py-3"
        data-testid="upgrade-banner"
      >
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-brand shrink-0" />
          <span className="text-foreground">
            <span className="font-medium">Unlock your site&apos;s full potential</span>
            <span className="text-muted-foreground"> — remove branding, custom domain & more.</span>
          </span>
        </div>
        <Button
          size="sm"
          variant="brand"
          onClick={() => setOpen(true)}
          data-testid="open-upgrade-dialog"
          className="shrink-0 font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all"
        >
          Subscribe
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="upgrade-dialog">
          <DialogHeader>
            <DialogTitle>Unlock full potential</DialogTitle>
            <DialogDescription>
              Choose a plan to remove branding and unlock every feature.
            </DialogDescription>
          </DialogHeader>

          <ul className="my-2 space-y-1.5">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-brand shrink-0" /> {perk}
              </li>
            ))}
          </ul>

          <div className="flex justify-center my-1">
            <div className="inline-flex items-center gap-1 rounded-full border bg-muted/40 p-1" role="tablist" aria-label="Billing period">
              {(["monthly", "yearly"] as const).map((pr) => (
                <button
                  key={pr}
                  type="button"
                  role="tab"
                  aria-selected={period === pr}
                  disabled={busy !== null}
                  onClick={() => setPeriod(pr)}
                  data-testid={`upgrade-period-${pr}`}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
                    period === pr ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {pr === "monthly" ? "Monthly" : "Yearly"}
                  {pr === "yearly" && (
                    <span className="rounded-full bg-green-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">
                      2 months free
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {PLAN_CARDS.map((p) => {
              const isSelected = selected === p.key
              return (
                <button
                  key={p.key}
                  onClick={() => setSelected(p.key)}
                  disabled={busy !== null}
                  aria-pressed={isSelected}
                  data-testid={`select-${p.key}`}
                  className={`relative flex flex-col items-start rounded-lg border p-4 text-left transition-all disabled:opacity-60 ${
                    isSelected
                      ? "border-brand ring-2 ring-brand bg-gradient-to-br from-brand/15 to-brand/5 shadow-md"
                      : p.highlight
                        ? "border-brand/60 bg-gradient-to-br from-brand/10 to-brand/5 hover:border-brand hover:shadow-md"
                        : "border-border bg-card hover:border-brand/50 hover:shadow-sm"
                  }`}
                >
                  {p.highlight && (
                    <span className="absolute right-3 top-3 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                      BEST VALUE
                    </span>
                  )}
                  <span className="text-sm font-medium">{p.label}</span>
                  <span className="mt-1 flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-sm font-normal text-muted-foreground line-through">{p[period].original}</span>
                    <span className="text-2xl font-bold">{p[period].price}</span>
                    <span className="text-sm font-normal text-muted-foreground">{p[period].per}</span>
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">{p.blurb}</span>
                  {isSelected && (
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
                      <Check className="h-3.5 w-3.5" /> Selected
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {selected && (
            <Button
              variant="brand"
              className="mt-4 w-full font-semibold"
              disabled={busy !== null}
              onClick={() => handleSubscribe(selected)}
              data-testid="checkout"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting…
                </>
              ) : (
                "Checkout"
              )}
            </Button>
          )}

          {error && (
            <p className="mt-3 text-sm text-destructive" data-testid="upgrade-error">
              {error}
            </p>
          )}
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Secure payments by Razorpay · Cancel anytime
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
