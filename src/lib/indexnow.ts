// IndexNow — instantly notify Bing, Yandex, et al. when a URL is published or
// updated, instead of waiting for the next crawl. Best-effort: a failure here
// must never block a publish, so every call swallows its own errors.
//
// Setup: set INDEXNOW_KEY to a hex string (8–128 chars of [a-f0-9]). The key is
// served from /api/indexnow-key and referenced via `keyLocation`.

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow"

export function indexNowConfigured(): boolean {
  return !!process.env.INDEXNOW_KEY
}

/**
 * Submit one or more absolute URLs to IndexNow. URLs are grouped by host
 * because each IndexNow request may only contain URLs from a single host.
 */
export async function submitToIndexNow(urls: string[]): Promise<void> {
  const key = process.env.INDEXNOW_KEY
  if (!key || urls.length === 0) return

  const byHost = new Map<string, string[]>()
  for (const u of urls) {
    try {
      const host = new URL(u).host
      const list = byHost.get(host) ?? []
      list.push(u)
      byHost.set(host, list)
    } catch {
      /* skip malformed URL */
    }
  }

  await Promise.all(
    [...byHost.entries()].map(async ([host, urlList]) => {
      try {
        await fetch(INDEXNOW_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({
            host,
            key,
            keyLocation: `https://${host}/api/indexnow-key`,
            urlList,
          }),
        })
      } catch {
        /* best-effort — never block the caller */
      }
    }),
  )
}
