"use client"

import { useEffect } from "react"
import Clarity from "@microsoft/clarity"
import { CLARITY_ID } from "@/lib/analytics"

// Clarity.init injects its script via window/document, so it must run on the
// client after mount. Rendered only when clarityEnabled (see app/layout.tsx),
// so this component never mounts unless CLARITY_ID is set.
export function ClarityAnalytics() {
  useEffect(() => {
    if (CLARITY_ID) Clarity.init(CLARITY_ID)
  }, [])

  return null
}
