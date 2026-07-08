// Shared pricing data for the marketing page. Plain module (no "use client") so
// both the server page (comparison table) and the client PricingPlans component
// can import these constants directly.

export interface Feature {
  label: string
  free: boolean
  pro: boolean
  max: boolean
}

export const FEATURES: Feature[] = [
  { label: "Website on yourname.site9.in", free: true, pro: true, max: true },
  { label: "5 starter templates", free: true, pro: false, max: false },
  { label: "All 100+ templates", free: false, pro: true, max: true },
  { label: "Contact form", free: true, pro: true, max: true },
  { label: "WhatsApp button", free: true, pro: true, max: true },
  { label: "1 blog post", free: true, pro: false, max: false },
  { label: "Unlimited blog posts", free: false, pro: true, max: true },
  { label: "\"Powered by Site9\" badge", free: true, pro: false, max: false },
  { label: "Remove Site9 badge", free: false, pro: true, max: true },
  { label: "Custom domain (yourbusiness.com)", free: false, pro: true, max: true },
  { label: "Google Analytics integration", free: false, pro: true, max: true },
  { label: "Priority email support", free: false, pro: true, max: true },
  { label: "Priority support & onboarding", free: false, pro: false, max: true },
]

/** Websites allowed per tier (shown as the headline benefit). */
export const SITES = { free: "1 website", pro: "5 websites", max: "20 websites" }
