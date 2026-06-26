"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeLogo({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const src = mounted && resolvedTheme === "light"
    ? "/logo-horizontal-light.svg"
    : "/logo-horizontal.svg"

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Site9 — One Website for Every Business"
      className={className ?? "h-10 w-auto"}
    />
  )
}
