import { test, expect } from "@playwright/test"

/**
 * E2E: smoke + functional checks for the Site9 marketing/auth surface. (Issue #6)
 *
 * These run against the apex (Site9 marketing site), logged out. They assert the
 * pages a brand-new visitor hits actually work — content renders, the primary
 * CTAs are present, and the mobile menu (hidden md:flex nav) is reachable on a
 * phone-sized viewport.
 *
 * Run: BASE_URL=http://localhost:3001 pnpm test:e2e public-smoke
 */

test.describe("Landing page", () => {
  test("hero renders with both CTAs", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { name: /One Website for Every Business/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /Create your website/i }).first()).toBeVisible()
    await expect(page.getByRole("link", { name: /Browse templates/i }).first()).toBeVisible()
  })

  test("logo links home", async ({ page }) => {
    await page.goto("/pricing")
    await page.getByTestId("home-logo").click()
    await expect(page).toHaveURL(/\/$|\/#/)
  })
})

test.describe("Mobile navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test("hamburger opens the menu and exposes nav links", async ({ page }) => {
    await page.goto("/")
    // The inline desktop nav is hidden on mobile; the toggle must be present.
    const toggle = page.getByTestId("mobile-nav-toggle")
    await expect(toggle).toBeVisible()
    await toggle.click()
    const panel = page.getByTestId("mobile-nav-panel")
    await expect(panel).toBeVisible()
    await expect(panel.getByRole("link", { name: /Templates/i })).toBeVisible()
    await expect(panel.getByRole("link", { name: /Get started/i })).toBeVisible()
  })

  // Regression: navigating via the mobile menu used to land on a page with no
  // hamburger (Pricing/Templates had desktop-only nav), trapping the user.
  test("menu stays reachable after navigating to Pricing then Templates", async ({ page }) => {
    const openMenuAndClick = async (linkName: RegExp) => {
      const toggle = page.getByTestId("mobile-nav-toggle")
      await expect(toggle).toBeVisible()
      await toggle.click()
      const panel = page.getByTestId("mobile-nav-panel")
      await expect(panel).toBeVisible()
      await panel.getByRole("link", { name: linkName }).click()
    }

    await page.goto("/")
    await openMenuAndClick(/Pricing/i)
    await expect(page).toHaveURL(/\/pricing/)
    // The menu must be reachable again on the destination page (the bug: it wasn't).
    await openMenuAndClick(/Templates/i)
    await expect(page).toHaveURL(/\/templates/)
    await expect(page.getByTestId("mobile-nav-toggle")).toBeVisible()
  })
})

test.describe("Marketing routes load", () => {
  for (const [route, marker] of [
    ["/pricing", /pricing|plan|free/i],
    ["/templates", /template/i],
    ["/open-source", /open source|contribute/i],
  ] as const) {
    test(`${route} shows expected content`, async ({ page }) => {
      await page.goto(route)
      await expect(page.locator("body")).toContainText(marker)
    })
  }
})

test.describe("Auth pages", () => {
  test("login form renders", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByTestId("login-email")).toBeVisible()
    await expect(page.getByTestId("login-password")).toBeVisible()
    await expect(page.getByTestId("login-submit")).toBeVisible()
  })

  test("login links to register / start", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByRole("link", { name: /sign up|get started|create/i }).first()).toBeVisible()
  })
})
