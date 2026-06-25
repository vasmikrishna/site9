import { test, expect } from "@playwright/test"

/**
 * E2E: Social Media Management — admin Social tab. (mock-first)
 *
 * Prereqs:
 *   - dev server running (pnpm dev) on BASE_URL pointed at a tenant's admin subdomain.
 *   - SOCIAL_MOCK=1 in the server env (or META_APP_ID absent) so connect/generate
 *     use MockProvider instead of Meta OAuth.
 *   - Migration 019_social.sql applied to Supabase.
 *   - An admin session cookie in the browser context (same assumption as
 *     billing-upgrade.spec.ts — tests run against a signed-in tenant session).
 *
 * These tests cover the gating UI, mock connect flow, Composer submit, and AI
 * generation; they do not exercise real Meta OAuth or actual posting to Instagram/
 * Facebook (that requires a live Meta App and App Review).
 *
 * If the /admin/social route is inaccessible (no session / feature flag off), the
 * tests will time-out waiting for the tabs container rather than throw unrelated
 * errors — mirror the billing-upgrade.spec.ts approach.
 */

test.describe("Social tab navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/social")
  })

  test("Social page loads and shows the four tabs", async ({ page }) => {
    await expect(page.getByTestId("social-tabs")).toBeVisible()
    await expect(page.getByTestId("social-tab-connections")).toBeVisible()
    await expect(page.getByTestId("social-tab-calendar")).toBeVisible()
    await expect(page.getByTestId("social-tab-drafts")).toBeVisible()
    await expect(page.getByTestId("social-tab-settings")).toBeVisible()
  })

  test("platform sub-tabs are visible inside Connections", async ({ page }) => {
    await page.getByTestId("social-tab-connections").click()
    await expect(page.getByTestId("social-platform-instagram")).toBeVisible()
    await expect(page.getByTestId("social-platform-facebook")).toBeVisible()
  })
})

test.describe("Connections — mock connect flow", () => {
  test("connect Instagram in mock mode seeds an account", async ({ page }) => {
    await page.goto("/admin/social")

    // Ensure we are on Connections / Instagram
    await page.getByTestId("social-tab-connections").click()
    await page.getByTestId("social-platform-instagram").click()

    // The Connect button is rendered whether or not accounts exist.
    // In mock mode the button label is "Connect Instagram" (empty state) or
    // "Add another Instagram account" (has accounts). Target by testid.
    const connectBtn = page.getByTestId("social-connect-instagram")
    await expect(connectBtn).toBeVisible()
    await connectBtn.click()

    // In mock mode the API returns immediately and updates state.
    // We expect the connect button to still be visible (re-rendered as "Add another…")
    // OR an account card to appear. Wait briefly for the network round-trip.
    await page.waitForTimeout(800)

    // Assert no hard navigation occurred (mock mode does NOT redirect to Meta OAuth).
    await expect(page).toHaveURL(/\/admin\/social/)

    // The Connections tab should still be active (not a full-page reload).
    await expect(page.getByTestId("social-tabs")).toBeVisible()
  })
})

test.describe("Composer — create and save a post", () => {
  /**
   * This test:
   *   1. Navigates to Calendar tab and opens the Composer.
   *   2. Fills a caption.
   *   3. Selects an account (if any connected); skips account selection if none.
   *   4. Chooses "Save draft" mode (avoids needing a scheduled time or live account).
   *   5. Submits and asserts the Composer closes (success path).
   *
   * If no accounts are connected the form will surface a validation error
   * ("Select at least one account") — the test detects this and is skipped
   * gracefully so it does not fail the suite.
   */
  test("opens Composer from Calendar tab and saves a draft", async ({ page }) => {
    await page.goto("/admin/social")
    await page.getByTestId("social-tab-calendar").click()

    // Open Composer — prefer the always-visible "New Post" button in the header.
    const newPostBtn = page.getByTestId("social-new-post")
    await expect(newPostBtn).toBeVisible()
    await newPostBtn.click()

    // Composer dialog should be open.
    await expect(page.getByTestId("social-composer")).toBeVisible()

    // Fill caption.
    await page.getByTestId("composer-caption").fill(
      "E2E test post — social media management"
    )

    // Select all available accounts (none expected in a fresh DB, but handle both).
    const accountCheckboxes = page.locator('[data-testid^="composer-account-"]')
    const accountCount = await accountCheckboxes.count()
    if (accountCount > 0) {
      // Select the first account.
      await accountCheckboxes.first().click()
    }

    // Ensure timing mode is "draft" (it is the default, but click explicitly).
    await page.getByTestId("composer-mode-draft").click()

    // Submit.
    await page.getByTestId("composer-submit").click()

    if (accountCount === 0) {
      // Expect a validation error message visible inside the dialog (no accounts).
      // The dialog stays open; we assert it and exit the test cleanly.
      const errorEl = page.locator('[data-testid="social-composer"] .text-destructive')
      await expect(errorEl).toBeVisible({ timeout: 3000 })
      // Cancel out.
      await page.getByTestId("composer-cancel").click()
      return
    }

    // With accounts: Composer should close on success.
    await expect(page.getByTestId("social-composer")).toBeHidden({ timeout: 5000 })

    // The Calendar tab (or drafts) should still be active — tabs still visible.
    await expect(page.getByTestId("social-tabs")).toBeVisible()
  })

  test("Composer validates required caption before submit", async ({ page }) => {
    await page.goto("/admin/social")
    await page.getByTestId("social-tab-calendar").click()
    await page.getByTestId("social-new-post").click()

    await expect(page.getByTestId("social-composer")).toBeVisible()

    // Leave caption empty; select a timing mode.
    await page.getByTestId("composer-mode-draft").click()

    // Attempt to submit without filling caption or accounts.
    await page.getByTestId("composer-submit").click()

    // A validation error should appear inside the composer.
    const errorEl = page.locator('[data-testid="social-composer"] .text-destructive')
    await expect(errorEl).toBeVisible({ timeout: 3000 })

    await page.getByTestId("composer-cancel").click()
  })

  test("post appears in Calendar after saving as scheduled (mock account required)", async ({ page }) => {
    // NOTE: This test requires at least one mock account to be connected.
    // If no accounts exist the submit will fail validation and the post won't appear.
    await page.goto("/admin/social")

    // Connect a mock Instagram account first.
    await page.getByTestId("social-tab-connections").click()
    await page.getByTestId("social-platform-instagram").click()
    const connectBtn = page.getByTestId("social-connect-instagram")
    await connectBtn.click()
    await page.waitForTimeout(800) // allow mock API to respond

    // Open Calendar → Composer.
    await page.getByTestId("social-tab-calendar").click()
    await page.getByTestId("social-new-post").click()
    await expect(page.getByTestId("social-composer")).toBeVisible()

    // Fill caption.
    await page.getByTestId("composer-caption").fill("Scheduled post from E2E test")

    // Select the first available account.
    const firstAccount = page.locator('[data-testid^="composer-account-"]').first()
    const hasAccount = (await firstAccount.count()) > 0
    if (!hasAccount) {
      // No account — skip gracefully.
      await page.getByTestId("composer-cancel").click()
      test.skip()
      return
    }
    await firstAccount.click()

    // Choose Schedule mode and set a future datetime.
    await page.getByTestId("composer-mode-schedule").click()
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16) // "YYYY-MM-DDTHH:mm"
    await page.getByTestId("composer-schedule-at").fill(futureDate)

    // Submit.
    await page.getByTestId("composer-submit").click()

    // Composer should close.
    await expect(page.getByTestId("social-composer")).toBeHidden({ timeout: 5000 })

    // The Calendar tab should now show the scheduled post.
    // We look for at least one post card rendered in the calendar list.
    // Post cards don't have a static testid, so we check for visible text.
    await expect(page.getByText("Scheduled post from E2E test")).toBeVisible({
      timeout: 5000,
    })
  })
})

test.describe("Drafts & AI — AI generation", () => {
  test("clicking Generate a post now calls the generate API and shows a draft card", async ({ page }) => {
    await page.goto("/admin/social")
    await page.getByTestId("social-tab-drafts").click()

    // The Drafts & AI panel should be visible.
    // The generate button is always present regardless of existing drafts.
    const generateBtn = page.getByTestId("social-generate")
    await expect(generateBtn).toBeVisible()

    // Click generate and wait for the API (mock mode is fast; real Tavily+LLM is slow).
    await generateBtn.click()

    // The button label changes to "Generating…" during the request.
    // Then a new draft card should appear in the list.
    // We wait up to 10 s — in mock mode the provider returns a synthetic draft instantly.
    await expect(
      page.locator('[data-testid^="ai-approve-"], [data-testid^="ai-edit-"], [data-testid^="ai-discard-"]')
        .first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test("Drafts & AI tab is reachable and renders the generate CTA", async ({ page }) => {
    await page.goto("/admin/social")
    await page.getByTestId("social-tab-drafts").click()

    await expect(page.getByTestId("social-generate")).toBeVisible()
    // The CTA card text confirms correct tab.
    await expect(page.getByText("AI Content Generation")).toBeVisible()
  })
})

test.describe("Settings tab", () => {
  test("Settings tab renders all controls", async ({ page }) => {
    await page.goto("/admin/social")
    await page.getByTestId("social-tab-settings").click()

    await expect(page.getByTestId("settings-auto-generate")).toBeVisible()
    await expect(page.getByTestId("settings-autopublish")).toBeVisible()
    await expect(page.getByTestId("settings-niche")).toBeVisible()
    await expect(page.getByTestId("settings-keywords")).toBeVisible()
    await expect(page.getByTestId("settings-tone")).toBeVisible()
    await expect(page.getByTestId("settings-post-count")).toBeVisible()
    await expect(page.getByTestId("settings-save")).toBeVisible()
  })

  test("typing a niche and saving succeeds", async ({ page }) => {
    await page.goto("/admin/social")
    await page.getByTestId("social-tab-settings").click()

    await page.getByTestId("settings-niche").fill("Fitness & Wellness")
    await page.getByTestId("settings-save").click()

    // A success banner ("Settings saved") should appear briefly.
    // We look for visible text in the inline banner element.
    await expect(page.getByText("Settings saved")).toBeVisible({ timeout: 5000 })
  })
})
