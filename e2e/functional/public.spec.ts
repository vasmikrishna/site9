import { test, expect } from "@playwright/test"

/**
 * Functional e2e for the public visitor on a real tenant site (the seeded
 * e2e-sandbox subdomain). Drives the contact form UI end-to-end and asserts the
 * success state — which means a contact_enquiries row was written for the tenant.
 */
const SANDBOX = process.env.E2E_SANDBOX_ORIGIN ?? "https://e2e-sandbox.site9.in"

test.describe("Public tenant site", () => {
  test("public homepage loads", async ({ page }) => {
    const res = await page.goto(`${SANDBOX}/`, { waitUntil: "networkidle" })
    expect(res?.status()).toBeLessThan(400)
    await expect(page.locator("body")).not.toBeEmpty()
  })

  test("contact form submits and confirms", async ({ page }) => {
    await page.goto(`${SANDBOX}/contact`, { waitUntil: "networkidle" })
    await page.getByPlaceholder("Jane Smith").fill("E2E Form Visitor")
    await page.getByPlaceholder("jane@example.com").fill("formvisitor@e2e.test")
    await page.getByPlaceholder(/Tell us a bit about your business/i).fill(
      "Submitted via Playwright functional test."
    )
    await page.getByRole("button", { name: /Send message/i }).click()
    await expect(page.getByText(/Message sent!/i)).toBeVisible({ timeout: 20_000 })
  })
})
