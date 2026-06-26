"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react"
import type { GalleryTemplateMeta } from "@/types"

export function TemplateCarousel() {
  const [templates, setTemplates] = useState<GalleryTemplateMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [scrollIndex, setScrollIndex] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/templates?limit=12&featured=true")
        const data = await res.json()
        if (res.ok && data.templates?.length) {
          setTemplates(data.templates)
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const visibleCount = typeof window !== "undefined" && window.innerWidth < 768 ? 1 : 3
  const maxIndex = Math.max(0, templates.length - visibleCount)

  const scrollTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, maxIndex))
    setScrollIndex(clamped)
    if (trackRef.current) {
      const card = trackRef.current.children[0] as HTMLElement | undefined
      if (card) {
        const gap = 24
        const cardWidth = card.offsetWidth + gap
        trackRef.current.scrollTo({ left: clamped * cardWidth, behavior: "smooth" })
      }
    }
  }, [maxIndex])

  const next = useCallback(() => {
    setScrollIndex((prev) => {
      const nextIdx = prev >= maxIndex ? 0 : prev + 1
      setTimeout(() => scrollTo(nextIdx), 0)
      return nextIdx
    })
  }, [maxIndex, scrollTo])

  const prev = useCallback(() => {
    scrollTo(scrollIndex - 1)
  }, [scrollIndex, scrollTo])

  useEffect(() => {
    if (templates.length <= visibleCount) return
    intervalRef.current = setInterval(next, 4000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [templates.length, visibleCount, next])

  const resetAutoScroll = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(next, 4000)
  }, [next])

  if (loading) {
    return (
      <div className="flex gap-6 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className="min-w-[calc(33.333%-16px)] aspect-[4/3] bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (templates.length === 0) return null

  return (
    <div className="relative group">
      <div
        ref={trackRef}
        className="flex gap-6 overflow-hidden scroll-smooth"
      >
        {templates.map((template) => (
          <Card
            key={template.id}
            className="min-w-[calc(100%-0px)] md:min-w-[calc(33.333%-16px)] flex-shrink-0 overflow-hidden hover:border-foreground/30 transition-colors"
          >
            <div className="aspect-[4/3] bg-muted overflow-hidden">
              {template.preview_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={template.preview_url}
                  alt={template.name}
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                  No preview
                </div>
              )}
            </div>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{template.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{template.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs capitalize">{template.style}</Badge>
                <Badge variant="outline" className="text-xs capitalize">{template.category}</Badge>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full" data-testid={`template-${template.slug}-cta`}>
                <Link href={`/templates/${template.slug}`}>
                  Use this template <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length > visibleCount && (
        <>
          <button
            onClick={() => { prev(); resetAutoScroll() }}
            className="absolute left-0 top-1/3 -translate-x-4 bg-background border border-border rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Previous template"
            data-testid="carousel-prev"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => { next(); resetAutoScroll() }}
            className="absolute right-0 top-1/3 translate-x-4 bg-background border border-border rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Next template"
            data-testid="carousel-next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      <div className="flex items-center justify-center gap-1.5 mt-6">
        {templates.slice(0, maxIndex + 1).map((_, i) => (
          <button
            key={i}
            onClick={() => { scrollTo(i); resetAutoScroll() }}
            className={`h-1.5 rounded-full transition-all ${i === scrollIndex ? "w-6 bg-foreground" : "w-1.5 bg-muted-foreground/30"}`}
            aria-label={`Go to template ${i + 1}`}
            data-testid={`carousel-dot-${i}`}
          />
        ))}
      </div>
    </div>
  )
}
