/**
 * Social provider abstraction.
 *
 * Exports:
 *   - PublishResult interface
 *   - SocialProvider interface
 *   - MockProvider — realistic fake, no network calls
 *   - getProvider(platform) — factory: returns MockProvider when SOCIAL_MOCK=1
 *     or META_APP_ID is unset; otherwise returns MetaProvider.
 *   - mockConnectAccounts(tenantId) — returns fake account insert objects for
 *     seeding or mock-connect flows.
 */

import { randomUUID } from "crypto"
import type { SocialAccount, SocialPlatform, SocialPost } from "@/types"
import { encryptToken } from "./crypto"

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface PublishResult {
  externalId: string
  permalink: string
}

export interface SocialProvider {
  publish(account: SocialAccount, post: SocialPost): Promise<PublishResult>
}

// ── MockProvider ──────────────────────────────────────────────────────────────

export class MockProvider implements SocialProvider {
  async publish(account: SocialAccount, _post: SocialPost): Promise<PublishResult> {
    const mockId = randomUUID().replace(/-/g, "").slice(0, 11)
    const permalink =
      account.platform === "instagram"
        ? `https://www.instagram.com/p/MOCK${mockId}`
        : `https://www.facebook.com/${account.external_id}/posts/MOCK${mockId}`
    return {
      externalId: `MOCK${mockId}`,
      permalink,
    }
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Returns the correct SocialProvider for the given platform.
 *
 * Uses MockProvider when:
 *   - SOCIAL_MOCK=1  (explicit mock mode), OR
 *   - META_APP_ID is not set (no real credentials)
 *
 * Otherwise loads MetaProvider from ./meta (real Graph API).
 */
export function getProvider(_platform: SocialPlatform): SocialProvider {
  const useMock =
    process.env.SOCIAL_MOCK === "1" || !process.env.META_APP_ID

  if (useMock) {
    return new MockProvider()
  }

  // Dynamic require to avoid loading Meta dependencies in mock environments
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MetaProvider } = require("./meta") as { MetaProvider: new () => SocialProvider }
  return new MetaProvider()
}

// ── mockConnectAccounts ───────────────────────────────────────────────────────

/** Shape of a social_accounts insert (all required fields, id omitted). */
export interface SocialAccountInsert {
  tenant_id: string
  platform: SocialPlatform
  external_id: string
  name: string
  username: string | null
  avatar_url: string | null
  access_token_enc: string
  token_expires_at: string | null
  scopes: string[]
  status: "active"
  meta: Record<string, unknown>
}

/**
 * Returns two fake social_accounts insert objects (one Facebook page, one
 * Instagram business account) — used by the mock-connect endpoint so devs can
 * exercise the full social flow without real Meta credentials.
 */
export function mockConnectAccounts(tenantId: string): SocialAccountInsert[] {
  const fbId = `10000${randomUUID().replace(/-/g, "").slice(0, 9)}`
  const igId = `17841${randomUUID().replace(/-/g, "").slice(0, 9)}`
  const encToken = encryptToken("mock-token")

  return [
    {
      tenant_id: tenantId,
      platform: "facebook",
      external_id: fbId,
      name: "Demo Business Page",
      username: null,
      avatar_url: "https://api.dicebear.com/9.x/initials/svg?seed=Demo+Business",
      access_token_enc: encToken,
      token_expires_at: null,
      scopes: [
        "pages_show_list",
        "pages_manage_posts",
        "pages_read_engagement",
        "business_management",
      ],
      status: "active",
      meta: { mock: true, page_id: fbId },
    },
    {
      tenant_id: tenantId,
      platform: "instagram",
      external_id: igId,
      name: "demo.business",
      username: "demo.business",
      avatar_url: "https://api.dicebear.com/9.x/initials/svg?seed=demo.business",
      access_token_enc: encToken,
      token_expires_at: null,
      scopes: [
        "instagram_basic",
        "instagram_content_publish",
      ],
      status: "active",
      meta: { mock: true, ig_user_id: igId },
    },
  ]
}
