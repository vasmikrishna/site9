import { defineConfig, devices } from "@playwright/test"

/**
 * Functional e2e — exercises real WRITE paths against a deployed environment
 * using a seeded sandbox tenant (e2e-sandbox) + test users (@e2e.test).
 * Defaults to production; override with BASE_URL. Separate from the default
 * playwright.config.ts so the public/responsive suites stay auth-free.
 *
 * Run: pnpm exec playwright test --config playwright.functional.config.ts
 */
const BASE = process.env.BASE_URL ?? "https://site9.in"

export default defineConfig({
  testDir: "./e2e/functional",
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL: BASE,
    trace: "on-first-retry",
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "admin",
      testMatch: /admin\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/admin.json" },
    },
    {
      name: "public",
      testMatch: /public\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Logs in per-test via env credentials (no seeded DB account); skips when
      // E2E_SUPERADMIN_EMAIL/PASSWORD are unset.
      name: "superadmin",
      testMatch: /superadmin\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})

