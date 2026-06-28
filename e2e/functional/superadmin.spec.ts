import { test, expect } from "@playwright/test"

/**
 * Functional e2e for the platform super-admin console (/superadmin).
 *
 * Super-admin auth is env-based (ADMIN_EMAIL/ADMIN_PASSWORD on the server), so
 * there's no DB account to seed. Provide the credentials to run this:
 *   E2E_SUPERADMIN_EMAIL=... E2E_SUPERADMIN_PASSWORD=... \
 *     pnpm exec playwright test --config playwright.functional.config.ts superadmin
 *
 * Read-only: it navigates the console pages and asserts they render; it does not
 * create or mutate platform data.
 */
const EMAIL = process.env.E2E_SUPERADMIN_EMAIL
const PASSWORD = process.env.E2E_SUPERADMIN_PASSWORD

test.describe("Super-admin console", () => {
  test.skip(!EMAIL || !PASSWORD, "Set E2E_SUPERADMIN_EMAIL/E2E_SUPERADMIN_PASSWORD to run.")

  test.beforeEach(async ({ page }) => {
    // page.request shares the browser context's cookie jar, so this login
    // authenticates subsequent page.goto navigations.
    const res = await page.request.post("/api/auth/login", {
      data: { email: EMAIL, password: PASSWORD },
    })
    expect(res.ok(), `super-admin login failed: ${res.status()}`).toBeTruthy()
    const body = await res.json()
    expect(body.superadmin, "logged-in account is not a super-admin").toBeTruthy()
  })

  test("platform dashboard loads with stats", async ({ page }) => {
    const res = await page.goto("/superadmin", { waitUntil: "networkidle" })
    expect(res?.status()).toBeLessThan(400)
    await expect(page.getByText(/Platform/i).first()).toBeVisible()
  })

  for (const path of ["/superadmin/users", "/superadmin/tenants", "/superadmin/payments"]) {
    test(`${path} renders`, async ({ page }) => {
      const res = await page.goto(path, { waitUntil: "networkidle" })
      expect(res?.status(), `${path} status`).toBeLessThan(400)
      await expect(page.locator("body")).not.toBeEmpty()
      // Not bounced back to /login (i.e., the super-admin gate passed).
      await expect(page).toHaveURL(/\/superadmin/)
    })
  }
})
