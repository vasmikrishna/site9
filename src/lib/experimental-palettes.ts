import type { ColorPalette, ColorPaletteColors } from "@/types"

/**
 * EXPERIMENTAL palette library.
 *
 * The standard palettes ({@link DEFAULT_PALETTES}) are a small, hand-picked
 * vibrant set. The experimental set is generated programmatically from the
 * well-known, battle-tested Tailwind color ramps so users have hundreds of
 * proven combinations to choose from — every color here ships in production
 * design systems, so nothing looks "off".
 *
 * Each (primary hue × accent hue) pair produces a light and a dark palette.
 */

// Tailwind v3 color ramps — well-known, accessible, production-tested values.
type Shade = "50" | "100" | "400" | "500" | "600" | "700" | "900" | "950"
type Ramp = Record<Shade, string>

const RAMPS: Record<string, Ramp> = {
  Slate:   { "50": "#f8fafc", "100": "#f1f5f9", "400": "#94a3b8", "500": "#64748b", "600": "#475569", "700": "#334155", "900": "#0f172a", "950": "#020617" },
  Gray:    { "50": "#f9fafb", "100": "#f3f4f6", "400": "#9ca3af", "500": "#6b7280", "600": "#4b5563", "700": "#374151", "900": "#111827", "950": "#030712" },
  Zinc:    { "50": "#fafafa", "100": "#f4f4f5", "400": "#a1a1aa", "500": "#71717a", "600": "#52525b", "700": "#3f3f46", "900": "#18181b", "950": "#09090b" },
  Red:     { "50": "#fef2f2", "100": "#fee2e2", "400": "#f87171", "500": "#ef4444", "600": "#dc2626", "700": "#b91c1c", "900": "#7f1d1d", "950": "#450a0a" },
  Orange:  { "50": "#fff7ed", "100": "#ffedd5", "400": "#fb923c", "500": "#f97316", "600": "#ea580c", "700": "#c2410c", "900": "#7c2d12", "950": "#431407" },
  Amber:   { "50": "#fffbeb", "100": "#fef3c7", "400": "#fbbf24", "500": "#f59e0b", "600": "#d97706", "700": "#b45309", "900": "#78350f", "950": "#451a03" },
  Yellow:  { "50": "#fefce8", "100": "#fef9c3", "400": "#facc15", "500": "#eab308", "600": "#ca8a04", "700": "#a16207", "900": "#713f12", "950": "#422006" },
  Lime:    { "50": "#f7fee7", "100": "#ecfccb", "400": "#a3e635", "500": "#84cc16", "600": "#65a30d", "700": "#4d7c0f", "900": "#365314", "950": "#1a2e05" },
  Green:   { "50": "#f0fdf4", "100": "#dcfce7", "400": "#4ade80", "500": "#22c55e", "600": "#16a34a", "700": "#15803d", "900": "#14532d", "950": "#052e16" },
  Emerald: { "50": "#ecfdf5", "100": "#d1fae5", "400": "#34d399", "500": "#10b981", "600": "#059669", "700": "#047857", "900": "#064e3b", "950": "#022c22" },
  Teal:    { "50": "#f0fdfa", "100": "#ccfbf1", "400": "#2dd4bf", "500": "#14b8a6", "600": "#0d9488", "700": "#0f766e", "900": "#134e4a", "950": "#042f2e" },
  Cyan:    { "50": "#ecfeff", "100": "#cffafe", "400": "#22d3ee", "500": "#06b6d4", "600": "#0891b2", "700": "#0e7490", "900": "#164e63", "950": "#083344" },
  Sky:     { "50": "#f0f9ff", "100": "#e0f2fe", "400": "#38bdf8", "500": "#0ea5e9", "600": "#0284c7", "700": "#0369a1", "900": "#0c4a6e", "950": "#082f49" },
  Blue:    { "50": "#eff6ff", "100": "#dbeafe", "400": "#60a5fa", "500": "#3b82f6", "600": "#2563eb", "700": "#1d4ed8", "900": "#1e3a8a", "950": "#172554" },
  Indigo:  { "50": "#eef2ff", "100": "#e0e7ff", "400": "#818cf8", "500": "#6366f1", "600": "#4f46e5", "700": "#4338ca", "900": "#312e81", "950": "#1e1b4b" },
  Violet:  { "50": "#f5f3ff", "100": "#ede9fe", "400": "#a78bfa", "500": "#8b5cf6", "600": "#7c3aed", "700": "#6d28d9", "900": "#4c1d95", "950": "#2e1065" },
  Purple:  { "50": "#faf5ff", "100": "#f3e8ff", "400": "#c084fc", "500": "#a855f7", "600": "#9333ea", "700": "#7e22ce", "900": "#581c87", "950": "#3b0764" },
  Fuchsia: { "50": "#fdf4ff", "100": "#fae8ff", "400": "#e879f9", "500": "#d946ef", "600": "#c026d3", "700": "#a21caf", "900": "#701a75", "950": "#4a044e" },
  Pink:    { "50": "#fdf2f8", "100": "#fce7f3", "400": "#f472b6", "500": "#ec4899", "600": "#db2777", "700": "#be185d", "900": "#831843", "950": "#500724" },
  Rose:    { "50": "#fff1f2", "100": "#ffe4e6", "400": "#fb7185", "500": "#f43f5e", "600": "#e11d48", "700": "#be123c", "900": "#881337", "950": "#4c0519" },
}

// Neutral anchors shared across generated palettes.
const NEUTRAL_TEXT = "#0f172a"   // slate-900
const NEUTRAL_MUTED = "#64748b"  // slate-500
const DARK_TEXT = "#f8fafc"      // slate-50
const DARK_MUTED = "#94a3b8"     // slate-400

const PRIMARY_HUES = Object.keys(RAMPS)

// A curated set of accent hues that pair well with most primaries.
const ACCENT_HUES = ["Blue", "Emerald", "Violet", "Amber", "Rose", "Cyan"]

function lightPalette(p: string, a: string): ColorPaletteColors {
  return {
    primary: RAMPS[p]["700"],
    secondary: RAMPS[p]["100"],
    accent: RAMPS[a]["500"],
    background: "#FFFFFF",
    text: NEUTRAL_TEXT,
    muted: NEUTRAL_MUTED,
  }
}

function darkPalette(p: string, a: string): ColorPaletteColors {
  return {
    primary: RAMPS[p]["400"],
    secondary: RAMPS[p]["900"],
    accent: RAMPS[a]["400"],
    background: RAMPS[p]["950"],
    text: DARK_TEXT,
    muted: DARK_MUTED,
  }
}

function mk(id: string, name: string, colors: ColorPaletteColors, sort: number): ColorPalette {
  return {
    id,
    name,
    colors,
    industry: "all",
    sort_order: sort,
    status: "approved",
    created_by: "system",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  }
}

function buildExperimentalPalettes(): ColorPalette[] {
  const out: ColorPalette[] = []
  let sort = 0

  for (const p of PRIMARY_HUES) {
    for (const a of ACCENT_HUES) {
      // Skip same-family pairings (primary + its own accent looks flat).
      if (a === p) continue
      out.push(mk(`exp-${p}-${a}-light`.toLowerCase(), `${p} · ${a}`, lightPalette(p, a), sort++))
      out.push(mk(`exp-${p}-${a}-dark`.toLowerCase(), `${p} · ${a} Dark`, darkPalette(p, a), sort++))
    }
  }

  return out
}

export const EXPERIMENTAL_PALETTES: ColorPalette[] = buildExperimentalPalettes()
