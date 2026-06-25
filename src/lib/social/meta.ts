/**
 * MetaProvider — Facebook & Instagram Graph API implementation.
 *
 * This is the real provider used when META_APP_ID and META_APP_SECRET are set
 * and SOCIAL_MOCK !== '1'. It communicates with Meta Graph API v21.0.
 *
 * Methods here will not run without valid Meta app credentials.
 */

import type { SocialAccount, SocialPost } from "@/types"
import type { PublishResult, SocialProvider } from "./provider"
import { decryptToken } from "./crypto"

const GRAPH_VERSION = "v21.0"
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

const META_SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
].join(",")

// ── OAuth helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the Facebook OAuth dialog URL to redirect the user to.
 *
 * @param state  CSRF state token (store in session before redirecting).
 * @param redirectUri  Must match the URI registered in the Meta app dashboard.
 */
export function getMetaAuthUrl(state: string, redirectUri: string): string {
  const appId = process.env.META_APP_ID
  if (!appId) throw new Error("META_APP_ID is not set")
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: META_SCOPES,
    response_type: "code",
    state,
  })
  return `https://www.facebook.com/dialog/oauth?${params.toString()}`
}

interface ShortLivedToken {
  access_token: string
  token_type: string
}

interface LongLivedToken {
  access_token: string
  token_type: string
  expires_in: number
}

/**
 * Exchanges a short-lived code for a long-lived user access token.
 *
 * Step 1 — code → short-lived token (Graph API token endpoint).
 * Step 2 — short-lived token → long-lived token (60-day).
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string; expiresAt: Date }> {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) throw new Error("META_APP_ID or META_APP_SECRET is not set")

  // Step 1: exchange code for short-lived token
  const shortParams = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  })
  const shortRes = await fetch(`${GRAPH_BASE}/oauth/access_token?${shortParams.toString()}`)
  if (!shortRes.ok) {
    const err = await shortRes.text()
    throw new Error(`Meta token exchange failed (step 1): ${err}`)
  }
  const shortData = (await shortRes.json()) as ShortLivedToken

  // Step 2: exchange short-lived for long-lived token
  const longParams = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortData.access_token,
  })
  const longRes = await fetch(`${GRAPH_BASE}/oauth/access_token?${longParams.toString()}`)
  if (!longRes.ok) {
    const err = await longRes.text()
    throw new Error(`Meta token exchange failed (step 2): ${err}`)
  }
  const longData = (await longRes.json()) as LongLivedToken
  const expiresAt = new Date(Date.now() + longData.expires_in * 1000)
  return { accessToken: longData.access_token, expiresAt }
}

interface MetaPage {
  id: string
  name: string
  access_token: string
  instagram_business_account?: { id: string }
}

interface InstagramAccount {
  id: string
  name: string
  username: string
  profile_picture_url: string
}

export interface ConnectedAccount {
  platform: "facebook" | "instagram"
  externalId: string
  name: string
  username: string | null
  avatarUrl: string | null
  pageAccessToken: string
}

/**
 * Lists all Facebook Pages the user manages and their linked Instagram
 * Business accounts.
 *
 * Returns an array of ConnectedAccount descriptors (one entry per
 * Facebook page + one per linked IG account).
 */
export async function listPagesAndInstagram(userToken: string): Promise<ConnectedAccount[]> {
  const pageFields = "id,name,access_token,instagram_business_account"
  const pagesRes = await fetch(
    `${GRAPH_BASE}/me/accounts?fields=${pageFields}&access_token=${userToken}`,
  )
  if (!pagesRes.ok) {
    const err = await pagesRes.text()
    throw new Error(`Failed to list Meta pages: ${err}`)
  }
  const pagesData = (await pagesRes.json()) as { data: MetaPage[] }
  const accounts: ConnectedAccount[] = []

  for (const page of pagesData.data) {
    accounts.push({
      platform: "facebook",
      externalId: page.id,
      name: page.name,
      username: null,
      avatarUrl: `https://graph.facebook.com/${GRAPH_VERSION}/${page.id}/picture?type=square`,
      pageAccessToken: page.access_token,
    })

    if (page.instagram_business_account) {
      const igId = page.instagram_business_account.id
      const igRes = await fetch(
        `${GRAPH_BASE}/${igId}?fields=id,name,username,profile_picture_url&access_token=${page.access_token}`,
      )
      if (igRes.ok) {
        const ig = (await igRes.json()) as InstagramAccount
        accounts.push({
          platform: "instagram",
          externalId: ig.id,
          name: ig.name,
          username: ig.username,
          avatarUrl: ig.profile_picture_url,
          pageAccessToken: page.access_token,
        })
      }
    }
  }
  return accounts
}

// ── MetaProvider (SocialProvider implementation) ──────────────────────────────

interface FeedPostResponse {
  id: string
  post_id?: string
}

interface MediaContainerResponse {
  id: string
}

interface MediaPublishResponse {
  id: string
}

export class MetaProvider implements SocialProvider {
  async publish(account: SocialAccount, post: SocialPost): Promise<PublishResult> {
    if (!account.access_token_enc) {
      throw new Error(`social_account ${account.id}: no access token stored`)
    }
    const token = decryptToken(account.access_token_enc)
    const captionText = [post.caption, ...post.hashtags.map((h) => `#${h}`)].join(" ")

    if (account.platform === "facebook") {
      return this.publishFacebook(account, token, captionText, post.media_urls)
    } else if (account.platform === "instagram") {
      return this.publishInstagram(account, token, captionText, post.media_urls)
    }
    throw new Error(`Unsupported platform: ${account.platform}`)
  }

  private async publishFacebook(
    account: SocialAccount,
    token: string,
    message: string,
    mediaUrls: string[],
  ): Promise<PublishResult> {
    const pageId = account.external_id
    let endpoint: string
    let body: Record<string, string>

    if (mediaUrls.length > 0) {
      endpoint = `${GRAPH_BASE}/${pageId}/photos`
      body = { url: mediaUrls[0], caption: message, access_token: token }
    } else {
      endpoint = `${GRAPH_BASE}/${pageId}/feed`
      body = { message, access_token: token }
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Facebook publish failed for page ${pageId}: ${err}`)
    }
    const data = (await res.json()) as FeedPostResponse
    const postId = data.post_id ?? data.id
    return {
      externalId: postId,
      permalink: `https://www.facebook.com/${pageId}/posts/${postId}`,
    }
  }

  private async publishInstagram(
    account: SocialAccount,
    token: string,
    caption: string,
    mediaUrls: string[],
  ): Promise<PublishResult> {
    const igUserId = account.external_id
    if (mediaUrls.length === 0) {
      throw new Error("Instagram requires at least one media URL to publish")
    }

    // Step 1: create media container
    const containerRes = await fetch(`${GRAPH_BASE}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: mediaUrls[0], caption, access_token: token }),
    })
    if (!containerRes.ok) {
      const err = await containerRes.text()
      throw new Error(`Instagram media container creation failed: ${err}`)
    }
    const container = (await containerRes.json()) as MediaContainerResponse

    // Step 2: publish the container
    const publishRes = await fetch(`${GRAPH_BASE}/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: container.id, access_token: token }),
    })
    if (!publishRes.ok) {
      const err = await publishRes.text()
      throw new Error(`Instagram media publish failed: ${err}`)
    }
    const published = (await publishRes.json()) as MediaPublishResponse
    return {
      externalId: published.id,
      permalink: `https://www.instagram.com/p/${published.id}`,
    }
  }
}
