/**
 * Social post publishing helpers.
 *
 * publishPost(postId)  — loads the post + targets, calls the right provider
 *                        for each target, updates statuses accordingly.
 * createTargets(postId, accountIds) — inserts pending social_post_targets rows.
 */

import { createClient } from "@/lib/supabase/server"
import { getProvider } from "./provider"
import type { SocialAccount, SocialPost } from "@/types"

// ── createTargets ─────────────────────────────────────────────────────────────

/**
 * Inserts one pending social_post_targets row per account id.
 * Idempotent — duplicate rows are silently ignored by the caller.
 */
export async function createTargets(
  postId: string,
  accountIds: string[],
): Promise<void> {
  if (!accountIds.length) return
  const supabase = createClient()
  const rows = accountIds.map((social_account_id) => ({
    post_id: postId,
    social_account_id,
    status: "pending" as const,
  }))
  await supabase.from("social_post_targets").insert(rows as never)
}

// ── publishPost ───────────────────────────────────────────────────────────────

export async function publishPost(postId: string): Promise<void> {
  const supabase = createClient()

  // 1. Load post
  const { data: post, error: postErr } = await supabase
    .from("social_posts")
    .select("*")
    .eq("id", postId)
    .single()

  if (postErr || !post) {
    throw new Error(`publishPost: post ${postId} not found — ${postErr?.message ?? "no data"}`)
  }

  // 2. Load targets with their linked account
  const { data: targets, error: tgtErr } = await supabase
    .from("social_post_targets")
    .select("*, social_accounts(*)")
    .eq("post_id", postId)

  if (tgtErr) {
    throw new Error(`publishPost: failed to load targets — ${tgtErr.message}`)
  }

  // 3. Guard: no targets
  if (!targets || targets.length === 0) {
    await supabase
      .from("social_posts")
      .update({ status: "failed", error: "No target accounts" } as never)
      .eq("id", postId)
    return
  }

  // 4. Mark post as publishing
  await supabase
    .from("social_posts")
    .update({ status: "publishing" } as never)
    .eq("id", postId)

  // 5. Publish to each target
  let successCount = 0
  const errors: string[] = []

  for (const target of targets) {
    // The joined account comes back under the relation key
    const account = (target as unknown as { social_accounts: SocialAccount | null }).social_accounts

    if (!account) {
      const errMsg = `Account not found for target ${target.id}`
      errors.push(errMsg)
      await supabase
        .from("social_post_targets")
        .update({ status: "failed", error: errMsg } as never)
        .eq("id", target.id)
      continue
    }

    try {
      const provider = getProvider(account.platform)
      const result = await provider.publish(account, post as unknown as SocialPost)

      await supabase
        .from("social_post_targets")
        .update({
          status: "published",
          external_post_id: result.externalId,
          permalink: result.permalink,
          published_at: new Date().toISOString(),
          error: null,
        } as never)
        .eq("id", target.id)

      successCount++
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      errors.push(errMsg)
      await supabase
        .from("social_post_targets")
        .update({ status: "failed", error: errMsg } as never)
        .eq("id", target.id)
    }
  }

  // 6. Update post status based on results
  if (successCount === targets.length) {
    // All succeeded
    await supabase
      .from("social_posts")
      .update({ status: "published", published_at: new Date().toISOString(), error: null } as never)
      .eq("id", postId)
  } else if (successCount === 0) {
    // All failed
    await supabase
      .from("social_posts")
      .update({ status: "failed", error: errors.join("; ") } as never)
      .eq("id", postId)
  } else {
    // Mixed — mark published (partial success)
    await supabase
      .from("social_posts")
      .update({ status: "published", published_at: new Date().toISOString(), error: errors.join("; ") } as never)
      .eq("id", postId)
  }
}
