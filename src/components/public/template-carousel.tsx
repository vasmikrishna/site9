"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { GalleryTemplateMeta } from "@/types"

export function TemplateCarousel() {
  const [templates, setTemplates] = useState<GalleryTemplateMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(0)
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

  const count = templates.length

  const next = useCallback(() => {
    setActive((prev) => (prev + 1) % count)
  }, [count])

  const prev = useCallback(() => {
    setActive((prev) => (prev - 1 + count) % count)
  }, [count])

  const startAutoPlay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(next, 4000)
  }, [next])

  useEffect(() => {
    if (count <= 1) return
    startAutoPlay()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [count, startAutoPlay])

  const handlePrev = () => { prev(); startAutoPlay() }
  const handleNext = () => { next(); startAutoPlay() }
  const handleDot = (i: number) => { setActive(i); startAutoPlay() }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-4 h-80">
        {[-1, 0, 1].map((i) => (
          <div
            key={i}
            className={`rounded-xl bg-muted animate-pulse flex-shrink-0 ${
              i === 0 ? "w-80 h-72" : "w-56 h-56 opacity-50 hidden md:block"
            }`}
          />
        ))}
      </div>
    )
  }

  if (count === 0) return null

  const getOffset = (index: number) => {
    let diff = index - active
    if (diff > count / 2) diff -= count
    if (diff < -count / 2) diff += count
    return diff
  }

  return (
    <div className="relative">
      <div className="relative h-[420px] md:h-[400px] flex items-center justify-center overflow-hidden">
        {templates.map((template, i) => {
          const offset = getOffset(i)
          const isCenter = offset === 0
          const isVisible = Math.abs(offset) <= 2

          if (!isVisible) return null

          const translateX = offset * 320
          const scale = isCenter ? 1 : 0.82
          const zIndex = isCenter ? 30 : 20 - Math.abs(offset)
          const opacity = isCenter ? 1 : Math.abs(offset) === 1 ? 0.6 : 0.3

          return (
            <Link
              key={template.id}
              href={`/templates/${template.slug}`}
              className="absolute transition-all duration-500 ease-out cursor-pointer"
              style={{
                transform: `translateX(${translateX}px) scale(${scale})`,
                zIndex,
                opacity,
              }}
              data-testid={`carousel-card-${i}`}
            >
              <div
                className={`w-72 md:w-80 rounded-xl overflow-hidden border transition-all duration-500 bg-card ${
                  isCenter
                    ? "border-foreground/20 shadow-2xl shadow-black/15 ring-1 ring-foreground/10"
                    : "border-border shadow-lg shadow-black/10"
                }`}
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
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm bg-muted">
                      Preview
                    </div>
                  )}
                </div>
                <div className="p-4 bg-background">
                  <p className="font-semibold text-sm">{template.name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs capitalize">{template.style}</Badge>
                    <Badge variant="outline" className="text-xs capitalize">{template.category}</Badge>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {count > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-40 bg-background/80 backdrop-blur border border-border rounded-full p-2.5 hover:bg-background transition-colors"
            aria-label="Previous template"
            data-testid="carousel-prev"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-40 bg-background/80 backdrop-blur border border-border rounded-full p-2.5 hover:bg-background transition-colors"
            aria-label="Next template"
            data-testid="carousel-next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      <div className="flex items-center justify-center gap-1.5 mt-6">
        {templates.map((_, i) => (
          <button
            key={i}
            onClick={() => handleDot(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === active ? "w-6 bg-foreground" : "w-1.5 bg-muted-foreground/30"
            }`}
            aria-label={`Go to template ${i + 1}`}
            data-testid={`carousel-dot-${i}`}
          />
        ))}
      </div>
    </div>
  )
}
