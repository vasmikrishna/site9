import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { getCurrentTenant } from "@/lib/tenant"
import { uploadToR2, isR2Configured } from "@/lib/r2"

export const runtime = "nodejs"

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

// POST /api/admin/social/upload
// Body: FormData with a "file" field (image/* only, max 5 MB).
// Returns: { url: string }
export async function POST(req: Request) {
  const session = await getSession()
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!isR2Configured()) {
    return NextResponse.json({ error: "Image storage not configured." }, { status: 503 })
  }

  const tenant = await getCurrentTenant().catch(() => null)
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
  }

  const formData = await req.formData().catch(() => null)
  const file = formData?.get("file")
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 })
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Image must be under 5 MB." }, { status: 400 })
  }

  try {
    const result = await uploadToR2(file, `social/${tenant.id}`)
    const base =
      process.env.NEXT_PUBLIC_APP_URL ??
      `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host")}`
    // result.url is already absolute when R2_PUBLIC_URL is set; prepend base only for proxy paths
    const absoluteUrl = result.url.startsWith("http") ? result.url : `${base}${result.url}`
    return NextResponse.json({ url: absoluteUrl })
  } catch {
    return NextResponse.json({ error: "Could not upload image." }, { status: 500 })
  }
}
