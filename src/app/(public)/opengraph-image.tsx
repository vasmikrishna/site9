import { ImageResponse } from "next/og"
import { getSiteSettings } from "@/lib/site-settings"

// Branded default social card for public pages that don't define a more
// specific opengraph-image (home, about, services, contact, blog index).
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  const settings = await getSiteSettings()
  const siteName = settings.site_name ?? "Site9"
  const tagline = settings.site_tagline ?? "One Website for Every Business"
  const primary = settings.theme_primary || "#4f46e5"

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px",
          background: `linear-gradient(135deg, ${primary} 0%, #111827 100%)`,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1, display: "flex" }}>{siteName}</div>
        <div style={{ fontSize: 36, opacity: 0.8, marginTop: 24, display: "flex" }}>
          {tagline.length > 90 ? `${tagline.slice(0, 90)}…` : tagline}
        </div>
      </div>
    ),
    { ...size },
  )
}
