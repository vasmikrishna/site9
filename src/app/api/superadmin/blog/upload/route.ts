import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { uploadToR2, isR2Configured } from "@/lib/r2"

export const runtime = "nodejs"

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]

/**
 * POST /api/superadmin/blog/upload?tenant_id=...
 * Upload a blog cover image on behalf of a site (super admin only).
 * Mirrors /api/build/upload but is gated by the super-admin session rather
 * than tenant ownership, which a super admin doesn't have.
 */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session || session.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const tenantId = new URL(req.url).searchParams.get("tenant_id")
  if (!tenantId) return NextResponse.json({ error: "tenant_id is required" }, { status: 400 })

  if (!isR2Configured()) {
    return NextResponse.json({ error: "Image storage not configured." }, { status: 503 })
  }

  const formData = await req.formData().catch(() => null)
  const file = formData?.get("file")
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, GIF, and SVG images are allowed." }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Image must be under 5 MB." }, { status: 400 })
  }

  try {
    const result = await uploadToR2(file, `builder/${tenantId}`)
    const base = process.env.NEXT_PUBLIC_APP_URL || `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host")}`
    return NextResponse.json({ url: `${base}${result.url}` })
  } catch {
    return NextResponse.json({ error: "Upload failed." }, { status: 500 })
  }
}
