#!/usr/bin/env node
// Daily Google index checker for site9.in.
//
// Reads the live sitemap, then asks Google Search Console's URL Inspection API
// for the real index status of every URL. No external deps — mints the service
// account JWT with node:crypto.
//
// Setup (one time):
//   1. In Google Cloud, create a service account and a JSON key.
//   2. Enable the "Google Search Console API" for that project.
//   3. In Search Console (search.google.com/search-console) → Settings → Users
//      and permissions → add the service account's client_email as a user
//      (Restricted is enough for read).
//   4. Point this script at the key + property:
//        export GSC_SA_KEY=/absolute/path/to/service-account.json
//        export GSC_SITE_URL="https://site9.in/"      # URL-prefix property, or
//        export GSC_SITE_URL="sc-domain:site9.in"     # Domain property
//   5. Run:  node scripts/check-indexing.mjs
//
// Exit code = number of URLs that are NOT "Submitted and indexed" (0 = all good).

import { readFileSync } from "node:fs"
import { createSign } from "node:crypto"

const SITEMAP = process.env.GSC_SITEMAP_URL ?? "https://site9.in/sitemap.xml"
const SITE_URL = process.env.GSC_SITE_URL ?? "https://site9.in/"
const KEY_PATH = process.env.GSC_SA_KEY

function die(msg) {
  console.error(`\n✗ ${msg}\n`)
  process.exit(2)
}

if (!KEY_PATH) {
  die(
    "GSC_SA_KEY is not set. This checker needs a Search Console service account.\n" +
      "  See the setup steps at the top of scripts/check-indexing.mjs.",
  )
}

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const claim = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  )
  const signer = createSign("RSA-SHA256")
  signer.update(`${header}.${claim}`)
  const signature = signer.sign(sa.private_key, "base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
  const jwt = `${header}.${claim}.${signature}`

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  })
  const json = await res.json()
  if (!res.ok) die(`Token request failed: ${json.error} — ${json.error_description ?? ""}`)
  return json.access_token
}

async function fetchSitemapUrls() {
  const res = await fetch(SITEMAP)
  if (!res.ok) die(`Could not fetch sitemap ${SITEMAP} (HTTP ${res.status})`)
  const xml = await res.text()
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
}

async function inspect(token, url) {
  const res = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE_URL }),
  })
  const json = await res.json()
  if (!res.ok) {
    return { coverageState: `ERROR ${res.status}: ${json.error?.message ?? "unknown"}`, verdict: "ERROR" }
  }
  const r = json.inspectionResult?.indexStatusResult ?? {}
  return {
    verdict: r.verdict ?? "?",
    coverageState: r.coverageState ?? "(no data)",
    lastCrawl: r.lastCrawlTime ?? "never",
    robots: r.robotsTxtState ?? "?",
  }
}

const sa = JSON.parse(readFileSync(KEY_PATH, "utf8"))
const token = await getAccessToken(sa)
const urls = await fetchSitemapUrls()

console.log(`\nGoogle index status — ${SITE_URL}  (${urls.length} URLs from sitemap)\n`)
const notIndexed = []
for (const url of urls) {
  const r = await inspect(token, url)
  const indexed = r.coverageState === "Submitted and indexed" || r.coverageState === "Indexed, not submitted in sitemap"
  const mark = indexed ? "✓" : "✗"
  if (!indexed) notIndexed.push({ url, ...r })
  console.log(`${mark} ${url}\n    ${r.coverageState}   (last crawl: ${r.lastCrawl})`)
}

console.log(`\n${urls.length - notIndexed.length}/${urls.length} indexed.`)
if (notIndexed.length) {
  console.log(`\nNot indexed (${notIndexed.length}):`)
  for (const n of notIndexed) console.log(`  - ${n.url} → ${n.coverageState}`)
  console.log(
    `\nNext steps by reason:\n` +
      `  • "Discovered – currently not indexed"  → crawl budget/newness: resubmit sitemap, add internal links, wait.\n` +
      `  • "Crawled – currently not indexed"     → content value: enrich thin pages, make each page unique, build links.\n` +
      `  • "Duplicate…" / "Alternate…"           → fix canonical to point to the intended URL.\n` +
      `  • "URL is unknown to Google"            → not discovered yet: ensure it's in the sitemap and internally linked.\n` +
      `Then use GSC → URL Inspection → "Request indexing" for each (or the Indexing API for eligible types).`,
  )
}
process.exit(notIndexed.length)
