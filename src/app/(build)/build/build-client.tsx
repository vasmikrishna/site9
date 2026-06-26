"use client"

import { useState, useEffect } from "react"
import { Builder } from "@/components/build/builder"
import { OnboardingWizard } from "@/components/build/onboarding-wizard"
import type { BusinessDetails } from "@/lib/onboarding"

interface BuildPageClientProps {
  initialDetails: BusinessDetails
  ownerName: string
  host: string
  onboardingComplete: boolean
  templateSlug?: string
  subscribed: boolean
  savedHtml?: string
}

export function BuildPageClient({
  initialDetails,
  ownerName,
  host,
  onboardingComplete,
  templateSlug,
  subscribed,
  savedHtml,
}: BuildPageClientProps) {
  const [showBuilder, setShowBuilder] = useState(onboardingComplete)
  const [generatedHtml, setGeneratedHtml] = useState(savedHtml ?? "")
  const [loadingTemplate, setLoadingTemplate] = useState(!!templateSlug)

  // Restore from localStorage if no server-side draft was found
  useEffect(() => {
    if (generatedHtml || !onboardingComplete) return
    try {
      const local = localStorage.getItem("s9_draft_html")
      if (local && local.length > 100) {
        setGeneratedHtml(local)
      }
    } catch { /* private browsing */ }
  }, [generatedHtml, onboardingComplete])

  useEffect(() => {
    if (!templateSlug) return
    setLoadingTemplate(true)
    fetch("/api/build/use-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateSlug }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.html) {
          const combined = data.css
            ? `<style>${data.css}</style>${data.html}`
            : data.html
          setGeneratedHtml(combined)
          setShowBuilder(true)
        }
      })
      .finally(() => setLoadingTemplate(false))
  }, [templateSlug])

  if (loadingTemplate) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground mx-auto" />
          <p className="text-muted-foreground">Loading template...</p>
        </div>
      </div>
    )
  }

  if (!showBuilder) {
    return (
      <OnboardingWizard
        initialDetails={initialDetails}
        onComplete={(html) => {
          setGeneratedHtml(html)
          setShowBuilder(true)
        }}
      />
    )
  }

  return (
    <Builder
      initialDetails={initialDetails}
      ownerName={ownerName}
      host={host}
      initialHtml={generatedHtml || undefined}
      subscribed={subscribed}
    />
  )
}
