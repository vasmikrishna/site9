"use client"

import { useEffect, useState } from "react"

const CREATE_STEPS = [
  "Sketching the layout…",
  "Designing your hero section…",
  "Choosing a type system…",
  "Styling components & cards…",
  "Balancing colors & spacing…",
  "Adding the finishing touches…",
]

const UPDATE_STEPS = [
  "Reading your request…",
  "Reworking the design…",
  "Restyling the affected sections…",
  "Polishing the details…",
]

/**
 * An engaging, animated placeholder shown while the AI builds or updates a
 * site. Shows a shimmering skeleton of a web page plus rotating status copy
 * and an indeterminate progress bar — so the wait feels alive.
 */
export function GenerationLoader({ mode = "create" }: { mode?: "create" | "update" }) {
  const steps = mode === "update" ? UPDATE_STEPS : CREATE_STEPS
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setStepIndex((i) => (i + 1) % steps.length)
    }, 2400)
    return () => clearInterval(id)
  }, [steps.length])

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5 px-6 py-6" data-testid="generation-loader">
      <style>{SHIMMER_KEYFRAMES}</style>

      {/* Status first — what's happening is always visible without scrolling. */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
        </div>
        <p key={stepIndex} className="text-base font-semibold animate-in fade-in slide-in-from-bottom-1 duration-500" data-testid="generation-step">
          {steps[stepIndex]}
        </p>

        {/* Indeterminate progress bar */}
        <div className="h-1.5 w-56 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: "40%", animation: "s9-progress 1.6s ease-in-out infinite" }}
          />
        </div>
        <p className="text-xs text-muted-foreground">This usually takes 15–45 seconds</p>
      </div>

      {/* Compact skeleton preview — a hint of the page taking shape, kept small
       * so it never pushes the status copy off a phone screen. */}
      <div className="hidden w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:block">
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-16" />
            <div className="flex gap-2">
              <Skeleton className="h-2.5 w-8" />
              <Skeleton className="h-2.5 w-8" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 py-3 text-center">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-2.5 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  )
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-md ${className}`}
      style={{
        background: "linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted-foreground)/0.12) 37%, hsl(var(--muted)) 63%)",
        backgroundSize: "400% 100%",
        animation: "s9-shimmer 1.4s ease infinite",
      }}
    />
  )
}

const SHIMMER_KEYFRAMES = `
@keyframes s9-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
@keyframes s9-progress {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(60%); }
  100% { transform: translateX(260%); }
}
`
