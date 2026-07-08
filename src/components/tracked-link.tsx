"use client"

import * as React from "react"
import Link from "next/link"
import { trackEvent } from "@/lib/analytics"

type LinkProps = React.ComponentProps<typeof Link>

interface TrackedLinkProps extends LinkProps {
  /** GA4 event name to fire on click, e.g. "sign_up_start". */
  event: string
  /** Extra params sent with the event (must be serializable). */
  eventParams?: Record<string, string | number | boolean | undefined>
}

/**
 * A next/link that reports a GA4 event when clicked. Lets server components
 * (the marketing header, home page) instrument conversion CTAs without becoming
 * client components — only the link itself crosses the client boundary. Forwards
 * ref + props so it drops into `<Button asChild>` (Radix Slot) unchanged.
 */
export const TrackedLink = React.forwardRef<HTMLAnchorElement, TrackedLinkProps>(
  ({ event, eventParams, onClick, ...props }, ref) => (
    <Link
      ref={ref}
      {...props}
      onClick={(e) => {
        trackEvent(event, eventParams)
        onClick?.(e)
      }}
    />
  )
)
TrackedLink.displayName = "TrackedLink"
