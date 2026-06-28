import { test as setup, expect } from "@playwright/test"
import fs from "fs"

/**
 * Logs in the seeded sandbox admin (owns the e2e-sandbox tenant) and saves the
 * authenticated storage state for the admin functional specs.
 *
 * Seeded out-of-band (SQL): e2e-admin@e2e.test owns tenant "e2e-sandbox".
 * Password defaults to the seed value; override with E2E_PASSWORD.
 */
const PASSWORD = process.env.E2E_PASSWORD ?? "E2eTest!2026"

setup("authenticate sandbox admin", async ({ request }) => {
  fs.mkdirSync("e2e/.auth", { recursive: true })
  const res = await request.post("/api/auth/login", {
    data: { email: "e2e-admin@e2e.test", password: PASSWORD },
  })
  expect(res.ok(), `login failed: ${res.status()}`).toBeTruthy()
  const body = await res.json()
  expect(body.ok).toBeTruthy()
  await request.storageState({ path: "e2e/.auth/admin.json" })
})
