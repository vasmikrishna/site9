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
    <div className="flex w-full max-w-xl flex-col items-center gap-6 px-6 py-10" data-testid="generation-loader">
      <style>{SHIMMER_KEYFRAMES}</style>

      {/* Skeleton web page mock */}
      <div className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="space-y-5 p-5">
          {/* Nav */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <div className="flex gap-3">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>

          {/* Hero */}
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
            <div className="mt-2 flex gap-2">
              <Skeleton className="h-8 w-28 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2 rounded-lg border border-border p-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rotating status copy */}
      <div className="flex flex-col items-center gap-3 text-center">
        <p key={stepIndex} className="text-sm font-medium animate-in fade-in slide-in-from-bottom-1 duration-500" data-testid="generation-step">
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
