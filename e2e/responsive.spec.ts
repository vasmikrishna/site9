import { test, expect, type Page } from "@playwright/test"

/**
 * E2E: responsive audit of the public + auth surface. (Issue #6)
 *
 * For every route a logged-out visitor can reach, we load it at mobile, tablet,
 * and desktop widths and assert:
 *   - the page renders (no error boundary / blank body)
 *   - there is NO horizontal overflow (the #1 "not usable on mobile" symptom)
 *   - no uncaught page errors fire
 *
 * Run: BASE_URL=http://localhost:3001 pnpm test:e2e responsive
 */

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const

// Routes reachable without a session. Authenticated routes (/dashboard, /admin/*,
// /build) redirect to /login and are covered by their own seeded-session specs.
const ROUTES = [
  "/",
  "/pricing",
  "/templates",
  "/open-source",
  "/v1",
  "/login",
  "/register",
  "/start",
  "/forgot-password",
]

/** Width the document actually occupies vs. what the viewport allows. */
async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement
    return Math.max(doc.scrollWidth, document.body.scrollWidth) - window.innerWidth
  })
}

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}px)`, () => {
    for (const route of ROUTES) {
      test(`${route} renders without horizontal overflow`, async ({ page }) => {
        const pageErrors: string[] = []
        page.on("pageerror", (e) => pageErrors.push(e.message))

        await page.setViewportSize({ width: vp.width, height: vp.height })
        const res = await page.goto(route, { waitUntil: "networkidle" })
        expect(res?.status(), `${route} HTTP status`).toBeLessThan(400)

        // Body has real content (not a blank error page).
        await expect(page.locator("body")).not.toBeEmpty()

        const overflow = await horizontalOverflow(page)
        // Allow 1px for sub-pixel rounding; anything more is a real layout break.
        expect(overflow, `${route} overflows by ${overflow}px at ${vp.width}px`).toBeLessThanOrEqual(1)

        expect(pageErrors, `${route} threw: ${pageErrors.join("; ")}`).toHaveLength(0)

        await page.screenshot({
          path: `test-results/responsive/${vp.name}${route.replace(/\//g, "_") || "_home"}.png`,
          fullPage: true,
        })
      })
    }
  })
}
