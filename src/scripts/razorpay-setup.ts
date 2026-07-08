/**
 * One-time Razorpay plan setup. Creates the Pro & Max plans in both monthly and
 * yearly cadences (yearly = 2 months free), then prints the plan IDs for .env.local.
 *
 * Usage:
 *   set -a && source .env.local && set +a && pnpm exec tsx src/scripts/razorpay-setup.ts
 *
 * Required env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
 * After running, set: RAZORPAY_PLAN_PRO_ID, RAZORPAY_PLAN_PRO_YEARLY_ID,
 *                     RAZORPAY_PLAN_MAX_ID, RAZORPAY_PLAN_MAX_YEARLY_ID
 */

import Razorpay from "razorpay"

const key_id = process.env.RAZORPAY_KEY_ID?.trim()
const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim()

if (!key_id || !key_secret) {
  console.error("✗ RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing. Source .env.local first.")
  process.exit(1)
}

const rzp = new Razorpay({ key_id, key_secret })

const PLANS = [
  {
    envVar: "RAZORPAY_PLAN_PRO_ID",
    period: "monthly" as const,
    interval: 1,
    amount: 9900, // ₹99 — up to 5 sites
    name: "Site9 Pro — 5 sites",
  },
  {
    envVar: "RAZORPAY_PLAN_PRO_YEARLY_ID",
    period: "yearly" as const,
    interval: 1,
    amount: 99000, // ₹990 — up to 5 sites, 2 months free
    name: "Site9 Pro — 5 sites (yearly)",
  },
  {
    envVar: "RAZORPAY_PLAN_MAX_ID",
    period: "monthly" as const,
    interval: 1,
    amount: 29900, // ₹299 — up to 20 sites
    name: "Site9 Max — 20 sites",
  },
  {
    envVar: "RAZORPAY_PLAN_MAX_YEARLY_ID",
    period: "yearly" as const,
    interval: 1,
    amount: 299000, // ₹2,990 — up to 20 sites, 2 months free
    name: "Site9 Max — 20 sites (yearly)",
  },
]

async function main() {
  console.log("Creating Razorpay plans…\n")
  for (const p of PLANS) {
    const plan = await rzp.plans.create({
      period: p.period,
      interval: p.interval,
      item: { name: p.name, amount: p.amount, currency: "INR" },
    })
    console.log(`✓ ${p.name}`)
    console.log(`  ${p.envVar}=${plan.id}\n`)
  }
  console.log("Done. Paste the IDs above into .env.local.")
}

main().catch((err) => {
  console.error("✗ Failed to create plans:", err?.message ?? err)
  process.exit(1)
})
