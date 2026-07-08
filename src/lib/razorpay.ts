import crypto from "crypto"
import Razorpay from "razorpay"

/**
 * Razorpay client + plan catalogue for subscription billing.
 *
 * When the keys are absent (local dev), `isRazorpayConfigured()` returns false
 * and callers fall back to unlocking the subscription inline so the flow stays
 * demoable without hitting Razorpay.
 */

export type PlanTier = "pro" | "max"
export type BillingPeriod = "monthly" | "yearly"
/** Composite plan id stored on the subscription, e.g. "pro_yearly". */
export type PlanKey = "pro_monthly" | "pro_yearly" | "max_monthly" | "max_yearly"

export interface PlanConfig {
  key: PlanKey
  tier: PlanTier
  /** Razorpay billing period (also the plan's billing cadence). */
  period: BillingPeriod
  /** Razorpay plan id (from env, created via scripts/razorpay-setup.ts). */
  planId: string | undefined
  /** Price in paise (₹1 = 100 paise). */
  amount: number
  /** Original (pre-discount) price in paise, shown struck through. */
  originalAmount: number
  /** Number of websites this plan unlocks. */
  sites: number
  interval: number
  /** Number of billing cycles to schedule the subscription for. */
  totalCount: number
  label: string
  /** Human-readable price, e.g. "₹99/month". */
  priceLabel: string
  /** Original price label, e.g. "₹199". */
  originalPriceLabel: string
  /** Short selling point shown on the plan card. */
  blurb: string
}

export const PLANS: Record<PlanKey, PlanConfig> = {
  pro_monthly: {
    key: "pro_monthly", tier: "pro", period: "monthly",
    planId: process.env.RAZORPAY_PLAN_PRO_ID,
    amount: 9900, // ₹99
    originalAmount: 19900, // ₹199
    sites: 5, interval: 1, totalCount: 120,
    label: "Pro",
    priceLabel: "₹99/month",
    originalPriceLabel: "₹199",
    blurb: "Up to 5 websites · all core features.",
  },
  pro_yearly: {
    key: "pro_yearly", tier: "pro", period: "yearly",
    planId: process.env.RAZORPAY_PLAN_PRO_YEARLY_ID,
    amount: 99000, // ₹990 — 2 months free
    originalAmount: 118800, // ₹1,188 (₹99 × 12)
    sites: 5, interval: 1, totalCount: 10,
    label: "Pro",
    priceLabel: "₹990/year",
    originalPriceLabel: "₹1,188",
    blurb: "Up to 5 websites · 2 months free.",
  },
  max_monthly: {
    key: "max_monthly", tier: "max", period: "monthly",
    planId: process.env.RAZORPAY_PLAN_MAX_ID,
    amount: 29900, // ₹299
    originalAmount: 49900, // ₹499
    sites: 20, interval: 1, totalCount: 120,
    label: "Max",
    priceLabel: "₹299/month",
    originalPriceLabel: "₹499",
    blurb: "Up to 20 websites · all features + priority support.",
  },
  max_yearly: {
    key: "max_yearly", tier: "max", period: "yearly",
    planId: process.env.RAZORPAY_PLAN_MAX_YEARLY_ID,
    amount: 299000, // ₹2,990 — 2 months free
    originalAmount: 358800, // ₹3,588 (₹299 × 12)
    sites: 20, interval: 1, totalCount: 10,
    label: "Max",
    priceLabel: "₹2,990/year",
    originalPriceLabel: "₹3,588",
    blurb: "Up to 20 websites · 2 months free.",
  },
}

export function getPlan(key: string): PlanConfig | null {
  return key in PLANS ? PLANS[key as PlanKey] : null
}

export function isRazorpayConfigured(): boolean {
  return !!process.env.RAZORPAY_KEY_ID?.trim() && !!process.env.RAZORPAY_KEY_SECRET?.trim()
}

let client: Razorpay | null = null

export function getRazorpay(): Razorpay {
  if (!client) {
    const key_id = process.env.RAZORPAY_KEY_ID?.trim()
    const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim()
    if (!key_id || !key_secret) throw new Error("Razorpay is not configured")
    client = new Razorpay({ key_id, key_secret })
  }
  return client
}

/** Public key id for the browser Checkout widget. */
export function getRazorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID?.trim() ?? ""
}

/**
 * Cancel a Razorpay subscription. `atCycleEnd=true` keeps it active until the
 * end of the current paid period; `false` cancels immediately.
 */
export async function cancelRazorpaySubscription(
  subscriptionId: string,
  atCycleEnd = true,
) {
  // razorpay typings accept a boolean "cancel at cycle end" flag.
  return getRazorpay().subscriptions.cancel(subscriptionId, atCycleEnd)
}

/** Fetch the live state of a Razorpay subscription. */
export async function fetchRazorpaySubscription(subscriptionId: string) {
  return getRazorpay().subscriptions.fetch(subscriptionId)
}

/**
 * Verify the signature returned by Razorpay Checkout after a subscription
 * authorisation: HMAC_SHA256(payment_id + "|" + subscription_id, key_secret).
 */
export function verifyCheckoutSignature(args: {
  razorpay_payment_id: string
  razorpay_subscription_id: string
  razorpay_signature: string
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim()
  if (!secret) return false
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${args.razorpay_payment_id}|${args.razorpay_subscription_id}`)
    .digest("hex")
  return timingSafeEqual(expected, args.razorpay_signature)
}

/** Verify a Razorpay webhook payload against the configured webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim()
  if (!secret || !signature) return false
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex")
  return timingSafeEqual(expected, signature)
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}
