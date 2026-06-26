import { NextResponse } from "next/server"
import { getR2Object, isR2Configured } from "@/lib/r2"

export const runtime = "nodejs"

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=31536000, immutable",
} as const

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  if (!path || path.length === 0) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 })
  }

  if (!isR2Configured()) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 })
  }

  const key = path.map(decodeURIComponent).join("/")

  try {
    const obj = await getR2Object(key)
    const body = await obj.Body?.transformToByteArray()
    if (!body) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return new NextResponse(Buffer.from(body), {
      status: 200,
      headers: {
        "Content-Type": obj.ContentType ?? "application/octet-stream",
        ...CACHE_HEADERS,
      },
    })
  } catch (err: unknown) {
    const code = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
    if (code === 404 || (err as Error)?.name === "NoSuchKey") {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    console.error("[resources/files]", err)
    return NextResponse.json({ error: "Storage error" }, { status: 502 })
  }
}
