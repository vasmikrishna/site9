// Serves the IndexNow key so search engines can verify ownership before
// accepting submissions. Referenced as `keyLocation` in submitToIndexNow().
export const dynamic = "force-dynamic"

export async function GET() {
  const key = process.env.INDEXNOW_KEY
  if (!key) {
    return new Response("Not found", { status: 404 })
  }
  return new Response(key, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
