"use client"

import { useEffect, useRef, useState } from "react"

const MAINTAINER = {
  name: "VK Reddy",
  username: "vasmikrishna",
  avatar: "https://github.com/vasmikrishna.png",
}

const TIERS = [
  {
    label: "Core Contributors",
    color: "#a78bfa",
    slots: 3,
  },
  {
    label: "Contributors",
    color: "#34d399",
    slots: 4,
  },
  {
    label: "Community",
    color: "#60a5fa",
    slots: 5,
  },
]

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  alpha: number
}

function useCanvasAnimation(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  ready: boolean
) {
  const particlesRef = useRef<Particle[]>([])
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !ready) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (!rect) return
      canvas.width = rect.width * 2
      canvas.height = rect.height * 2
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.scale(2, 2)
    }
    resize()

    const colors = ["#a78bfa", "#34d399", "#60a5fa", "#f472b6", "#fbbf24"]
    const w = canvas.width / 2
    const h = canvas.height / 2

    for (let i = 0; i < 40; i++) {
      particlesRef.current.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2.5 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.5 + 0.2,
      })
    }

    let tick = 0
    const draw = () => {
      tick++
      ctx.clearRect(0, 0, w, h)
      const particles = particlesRef.current

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
        p.alpha = 0.2 + 0.3 * Math.sin(tick * 0.02 + p.x * 0.01)
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(148, 130, 220, ${0.08 * (1 - dist / 120)})`
            ctx.lineWidth = 0.5
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.alpha
        ctx.fill()
        ctx.globalAlpha = 1
      }

      animFrameRef.current = requestAnimationFrame(draw)
    }

    draw()

    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      ro.disconnect()
      particlesRef.current = []
    }
  }, [canvasRef, ready])
}

export function Contributors() {
  const [phase, setPhase] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useCanvasAnimation(canvasRef, phase > 0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1000),
      setTimeout(() => setPhase(4), 1400),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center gap-0">
        {/* Maintainer — top of hierarchy */}
        <div
          className={`flex flex-col items-center transition-all duration-700 ease-out ${
            phase >= 1
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 -translate-y-6 scale-90"
          }`}
        >
          <a
            href={`https://github.com/${MAINTAINER.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center"
            data-testid="contributor-vasmikrishna"
          >
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-amber-500 opacity-75 blur-sm group-hover:opacity-100 transition-opacity animate-[spin_6s_linear_infinite]" />
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-background">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={MAINTAINER.avatar}
                  alt={MAINTAINER.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <span className="mt-3 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              Maintainer
            </span>
            <p className="mt-1.5 text-sm font-semibold group-hover:text-white transition-colors">
              {MAINTAINER.name}
            </p>
            <p className="text-xs text-muted-foreground">
              @{MAINTAINER.username}
            </p>
          </a>
        </div>

        {/* Connecting line from maintainer */}
        <div
          className={`w-px h-10 transition-all duration-500 ${
            phase >= 2
              ? "opacity-100 scale-y-100 bg-gradient-to-b from-purple-500/60 to-transparent"
              : "opacity-0 scale-y-0"
          }`}
          style={{ transformOrigin: "top" }}
        />

        {/* Tiers */}
        {TIERS.map((tier, tierIdx) => (
          <div key={tier.label} className="flex flex-col items-center w-full">
            {/* Tier label */}
            <div
              className={`transition-all duration-700 ease-out ${
                phase >= tierIdx + 2
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              <span
                className="inline-block px-3 py-1 rounded-full text-xs font-medium border mb-4"
                style={{
                  borderColor: `${tier.color}40`,
                  color: tier.color,
                  backgroundColor: `${tier.color}10`,
                }}
              >
                {tier.label}
              </span>
            </div>

            {/* Slots */}
            <div
              className={`flex flex-wrap items-center justify-center gap-4 transition-all duration-700 ease-out ${
                phase >= tierIdx + 2
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
            >
              {Array.from({ length: tier.slots }).map((_, slotIdx) => (
                <div
                  key={slotIdx}
                  className="group flex flex-col items-center gap-1.5"
                  style={{
                    transitionDelay: `${slotIdx * 100}ms`,
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:border-solid cursor-pointer"
                    style={{
                      borderColor: `${tier.color}30`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = tier.color
                      e.currentTarget.style.boxShadow = `0 0 20px ${tier.color}30`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `${tier.color}30`
                      e.currentTarget.style.boxShadow = "none"
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="w-6 h-6"
                      style={{ color: `${tier.color}50` }}
                    >
                      <path
                        d="M12 5v14M5 12h14"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <p
                    className="text-[10px] font-medium"
                    style={{ color: `${tier.color}80` }}
                  >
                    Open spot
                  </p>
                </div>
              ))}
            </div>

            {/* Connecting line between tiers */}
            {tierIdx < TIERS.length - 1 && (
              <div
                className={`w-px h-8 my-2 transition-all duration-500 ${
                  phase >= tierIdx + 3 ? "opacity-60 scale-y-100" : "opacity-0 scale-y-0"
                }`}
                style={{
                  transformOrigin: "top",
                  background: `linear-gradient(to bottom, ${tier.color}40, ${TIERS[tierIdx + 1].color}40)`,
                }}
              />
            )}
          </div>
        ))}

        {/* Bottom CTA */}
        <div
          className={`mt-8 transition-all duration-700 ${
            phase >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <a
            href="https://github.com/vasmikrishna/site9"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/60 transition-all"
            data-testid="contributors-github-cta"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            Claim your spot
          </a>
        </div>
      </div>
    </div>
  )
}
