import { test, expect } from "@playwright/test"

/**
 * Functional e2e for the owner/admin role, run with the seeded sandbox admin
 * session against a deployed env. Exercises the account dashboard, the admin
 * portal reads, and a real create → publish → public-render write path.
 *
 * The admin portal lives on the apex (baseURL); the published public page is
 * served from the tenant subdomain.
 */
const SANDBOX = process.env.E2E_SANDBOX_ORIGIN ?? "https://e2e-sandbox.site9.in"

test.describe("Account dashboard", () => {
  test("Dashboard tab shows overview stats + plan/quota", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" })
    await expect(page.getByTestId("dashboard-overview")).toBeVisible()
    await expect(page.getByTestId("site-usage")).toContainText(/of \d+ site/i)
    await expect(page.getByTestId("stat-sites")).toBeVisible()
    await expect(page.getByTestId("stat-pages")).toBeVisible()
  })

  test("My sites tab lists the sandbox site", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" })
    await page.getByTestId("tab-sites").click()
    await expect(page.getByTestId("sites-grid")).toContainText(/E2E Sandbox/i)
  })
})

test.describe("Admin portal", () => {
  test("admin dashboard renders", async ({ page }) => {
    await page.goto("/admin/dashboard", { waitUntil: "networkidle" })
    await expect(page.getByRole("heading", { name: /Admin Dashboard/i })).toBeVisible()
  })

  test("pages list loads", async ({ page }) => {
    await page.goto("/admin/pages", { waitUntil: "networkidle" })
    await expect(page.getByRole("heading", { name: /^Pages$/i })).toBeVisible()
  })

  test("enquiries list shows a submitted enquiry", async ({ page }) => {
    await page.goto("/admin/enquiries", { waitUntil: "networkidle" })
    // At least one enquiry exists for this tenant (seeded via the public flow).
    await expect(page.getByText(/@e2e\.test|E2E/i).first()).toBeVisible({ timeout: 20_000 })
  })

  test("billing offers subscribe options when no active subscription", async ({ page }) => {
    await page.goto("/admin/billing", { waitUntil: "networkidle" })
    await expect(page.getByTestId("billing-subscribe-monthly")).toBeVisible()
    await expect(page.getByTestId("billing-subscribe-annual")).toBeVisible()
  })
})

test.describe("Create → publish → public render (write path)", () => {
  const slug = `e2e-func-${process.env.E2E_RUN_ID ?? "page"}`

  test("a published custom page renders on the public site", async ({ page, request }) => {
    // Create (tenant resolved from the admin session via middleware).
    const create = await request.post("/api/admin/pages", {
      data: { title: "E2E Func Page", slug, html: "<h1>E2E FUNC OK</h1>" },
    })
    expect(create.ok(), `create failed: ${create.status()}`).toBeTruthy()
    const { page: created } = await create.json()
    expect(created?.id).toBeTruthy()

    // Publish.
    const patch = await request.patch(`/api/admin/pages/${created.id}`, {
      data: { status: "published" },
    })
    expect(patch.ok(), `publish failed: ${patch.status()}`).toBeTruthy()

    // It must render on the tenant's public site.
    await page.goto(`${SANDBOX}/p/${slug}`, { waitUntil: "networkidle" })
    await expect(page.locator("body")).toContainText("E2E FUNC OK")
  })
})
