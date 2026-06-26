"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"

interface Contributor {
  name: string
  username: string
  avatar: string
  role: "maintainer" | "contributor" | "placeholder"
}

const CONTRIBUTORS: Contributor[] = [
  {
    name: "VK Reddy",
    username: "vasmikrishna",
    avatar: "https://github.com/vasmikrishna.png",
    role: "maintainer",
  },
  { name: "Your Name", username: "you", avatar: "", role: "placeholder" },
  { name: "Your Name", username: "you", avatar: "", role: "placeholder" },
  { name: "Your Name", username: "you", avatar: "", role: "placeholder" },
  { name: "Your Name", username: "you", avatar: "", role: "placeholder" },
  { name: "Your Name", username: "you", avatar: "", role: "placeholder" },
]

function AvatarPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
        <path d="M12 12c2.5 0 4.5-2 4.5-4.5S14.5 3 12 3 7.5 5 7.5 7.5 9.5 12 12 12zM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export function Contributors() {
  const [visible, setVisible] = useState<boolean[]>(CONTRIBUTORS.map(() => false))

  useEffect(() => {
    CONTRIBUTORS.forEach((_, i) => {
      setTimeout(() => {
        setVisible((prev) => {
          const next = [...prev]
          next[i] = true
          return next
        })
      }, 150 * i)
    })
  }, [])

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      {CONTRIBUTORS.map((c, i) => (
        <div
          key={`${c.username}-${i}`}
          className={`transition-all duration-700 ease-out ${
            visible[i] ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"
          }`}
        >
          {c.role === "placeholder" ? (
            <div className="flex flex-col items-center gap-2 group">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-muted-foreground/30 group-hover:border-foreground/50 transition-colors">
                <AvatarPlaceholder />
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground/50">Could be you</p>
              </div>
            </div>
          ) : (
            <a
              href={`https://github.com/${c.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 group"
              data-testid={`contributor-${c.username}`}
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-foreground/20 group-hover:border-foreground/50 transition-all group-hover:scale-110 duration-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.avatar}
                    alt={c.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {c.role === "maintainer" && (
                  <Badge variant="brand" className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] px-1.5 py-0">
                    Maintainer
                  </Badge>
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium group-hover:text-foreground transition-colors">{c.name}</p>
                <p className="text-xs text-muted-foreground">@{c.username}</p>
              </div>
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
