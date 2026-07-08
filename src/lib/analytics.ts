import { sendGAEvent } from "@next/third-parties/google"

// Google Analytics measurement ID. Overridable per-environment; falls back to
// the Site9 property so analytics work out of the box, mirroring how the root
// layout defaults NEXT_PUBLIC_BASE_DOMAIN.
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-QFH8Q5XQLF"

// gtag.js is only mounted on deployed environments (see app/layout.tsx), so
// sendGAEvent is a no-op during `next dev`. This guard keeps that contract and
// avoids a runtime error if an event fires before the script hydrates.
export const analyticsEnabled = process.env.NODE_ENV === "production" && !!GA_ID

// Microsoft Clarity project ID (heatmaps + session recordings, alongside GA).
// No default — Clarity only mounts when this is set for the environment.
export const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID

// Mirror the GA contract: only load Clarity on deployed environments.
export const clarityEnabled = process.env.NODE_ENV === "production" && !!CLARITY_ID

/** Custom GA4 events we fire. Keep names snake_case per GA4 convention. */
type GAEventParams = Record<string, string | number | boolean | undefined>

export function trackEvent(name: string, params: GAEventParams = {}): void {
  if (!analyticsEnabled) return
  sendGAEvent("event", name, params)
}
