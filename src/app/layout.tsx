import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Providers } from "@/components/providers"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "site9.in"

// Search-console ownership. GSC "domain property" via DNS already covers the
// apex + every *.site9.in subdomain; these meta tags are the fallback for
// console verification (and let custom domains verify per-host later).
const GOOGLE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
const BING_VERIFICATION = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION

export const metadata: Metadata = {
  metadataBase: new URL(`https://${BASE_DOMAIN}`),
  title: { default: "Site9", template: "%s | Site9" },
  description:
    "Site9 — One Website for Every Business. Launch a professional website in minutes on a free subdomain. No coding, no design skills, no complicated setup.",
  ...(GOOGLE_VERIFICATION || BING_VERIFICATION
    ? {
        verification: {
          ...(GOOGLE_VERIFICATION ? { google: GOOGLE_VERIFICATION } : {}),
          ...(BING_VERIFICATION ? { other: { "msvalidate.01": BING_VERIFICATION } } : {}),
        },
      }
    : {}),
  openGraph: {
    type: "website",
    siteName: "Site9",
    title: "Site9 — One Website for Every Business",
    description:
      "Launch a professional website in minutes on a free subdomain. No coding, no design skills, no complicated setup.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Site9 — One Website for Every Business",
    description:
      "Launch a professional website in minutes on a free subdomain. No coding, no design skills, no complicated setup.",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
