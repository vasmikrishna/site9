# Social Media Management

Schedule and publish Instagram and Facebook posts directly from the tenant admin portal.
AI content discovery drafts posts automatically from your niche and keywords.
The entire feature is operational in mock mode with no Meta credentials — flip to real
Meta by supplying a Facebook App ID and completing App Review.
See [DECISIONS ADR-003](../../docs/DECISIONS.md) for the provider model rationale.

## Overview

| Capability | Detail |
|---|---|
| Platforms | Instagram, Facebook (X/Twitter, LinkedIn, YouTube — coming soon) |
| Publishing | Publish now, schedule, or save as draft |
| AI drafting | Tavily search + DeepSeek/Gemini, triggered manually or on a 6-hour cron |
| Mock mode | `SOCIAL_MOCK=1` (or absent `META_APP_ID`) — full UI + cron work, no Meta needed |
| Feature flag | `social: true` in `src/lib/features.ts` |
| Migration | `019_social.sql` — four tables, RLS disabled + grants per project convention |

## The four tabs

### Connections tab (`data-testid="social-tab-connections"`)
Nested platform tabs for Instagram and Facebook. Each shows:
- Connected accounts (avatar, name, @handle, active/error badge).
- A **Connect** button (`data-testid="social-connect-instagram"` / `social-connect-facebook`).
- **Disconnect** per account (`data-testid="social-disconnect-{id}"`).
- "Coming soon" chips for X / Twitter, LinkedIn, YouTube.

In mock mode, clicking Connect calls `POST /api/admin/social/connect { platform }` which
seeds a demo account row and returns immediately. In real mode the same call returns
`{ authUrl }` and the browser is redirected to the Meta OAuth flow.

### Calendar tab (`data-testid="social-tab-calendar"`)
Lists all posts with status `scheduled`, `published`, or `failed`, grouped by status.
Each card shows thumbnail, caption excerpt, target platform icons, timing, and status badge.
Hover actions: edit (draft/ready posts), delete, view live post link (published).
A **New Post** button (`data-testid="social-new-post"` / `social-calendar-new-post`) opens the Composer.

### Drafts & AI tab (`data-testid="social-tab-drafts"`)
Two sections:
- **AI Content Generation card** — "Generate a post now" button (`data-testid="social-generate"`)
  calls `POST /api/admin/social/generate`. Returns a `ready`-status post with caption,
  hashtags, source article link, and optional image. The card lets you preview, edit,
  discard, or **Approve & Schedule** (`data-testid="ai-approve-{id}"`).
- **Manual drafts** — posts with status `draft` saved from the Composer.

AI-drafted posts are labelled with a Sparkles icon and show the source article URL.

### Settings tab (`data-testid="social-tab-settings"`)
Saved per tenant in `social_settings`. Controls:

| Field | testid | Purpose |
|---|---|---|
| Auto-generate toggle | `settings-auto-generate` | Enables the 6-hour cron to run AI discovery |
| Auto-publish toggle | `settings-autopublish` | Publishes AI-generated posts without manual review |
| Niche / Industry | `settings-niche` | Free-text, e.g. "Fitness", "Real Estate" |
| Keywords | `settings-keywords` | Comma/space-separated, guide AI topic discovery |
| Tone of voice | `settings-tone` | Friendly / Professional / Playful / Bold |
| Posts per run | `settings-post-count` | How many drafts the AI generate run creates (1–20) |
| Save Settings | `settings-save` | Persists via `PUT /api/admin/social/settings` |

## Composer

Opened as a full-screen dialog (`data-testid="social-composer"`) from the Calendar or
Drafts tabs, or when editing an existing post.

**Left panel — editor:**
- Caption textarea (`data-testid="composer-caption"`) with 2 200-char counter.
- Hashtags input (`data-testid="composer-hashtags"`) — comma/space tokenised; preview badges rendered inline.
- Image upload — drag-and-drop zone (`data-testid="composer-upload-zone"`) or file picker (`data-testid="composer-file-input"`). Uploads via `POST /api/admin/social/upload` → Supabase Storage, returns a public URL.
- Account checkboxes (`data-testid="composer-account-{id}"`) — at least one required to submit.
- Timing mode buttons (`data-testid="composer-mode-draft"`, `composer-mode-now`, `composer-mode-schedule`). "Schedule" reveals a datetime-local picker (`data-testid="composer-schedule-at"`).
- Submit (`data-testid="composer-submit"`) / Cancel (`data-testid="composer-cancel"`).

**Right panel — live preview:**
Platform switcher (`data-testid="composer-preview-instagram"` / `composer-preview-facebook`)
renders a pixel-accurate platform card (`src/components/social/previews/`) as the user types.

## AI content discovery flow

1. `POST /api/admin/social/generate` (manual) or cron `GET /api/cron/social-discover` (every 6 h, when `auto_generate` is on).
2. `discover.ts`: Tavily searches for recent articles matching the tenant's niche + keywords.
3. Top result is passed to DeepSeek or Gemini (whichever key is present) to draft a caption + hashtags.
4. A `social_posts` row is inserted with `status = 'ready'`, `source = 'ai'`, `ai_source_title`, `ai_source_url`.
5. The Drafts & AI tab shows the card. If `autopublish` is on, the discover cron also sets `status = 'scheduled'` immediately (scheduled_at = now + buffer) so the publish cron picks it up.

## Mock vs. real provider

`src/lib/social/provider.ts` exports `getProvider(platform)`:

```
SOCIAL_MOCK=1  or  META_APP_ID absent  →  MockProvider   (in-memory / DB only)
META_APP_ID present                    →  MetaProvider   (real Meta Graph API)
```

To flip to real Meta:
1. Create a Facebook App (developers.facebook.com).
2. Complete App Review: `instagram_content_publish`, `pages_manage_posts`.
3. Set env vars (see below).
4. Remove `SOCIAL_MOCK` from your env file.
5. Redeploy.

## Environment variables

All documented in `social.env.example` at the project root.

| Variable | Required for real posting | Purpose |
|---|---|---|
| `META_APP_ID` | Yes | Facebook App ID |
| `META_APP_SECRET` | Yes | Facebook App Secret |
| `META_OAUTH_REDIRECT` | Yes | OAuth callback URL (`/api/social/meta/callback`) |
| `SOCIAL_TOKEN_ENC_KEY` | Yes | 32-byte hex key for AES-256-GCM token encryption |
| `CRON_SECRET` | Yes | Bearer token verified by cron route handlers |
| `TAVILY_API_KEY` | Yes (AI drafting) | Tavily web search for content discovery |
| `SOCIAL_MOCK` | No | Set to `1` to force `MockProvider` regardless of `META_APP_ID` |

## Cron schedule

Declared in `vercel.json`:

| Route | Schedule | Purpose |
|---|---|---|
| `/api/cron/social-publish` | Every 5 min | Publish all `social_posts` where `scheduled_at <= now` and `status = 'scheduled'` |
| `/api/cron/social-discover` | Every 6 hours | AI discovery + drafting when tenant has `auto_generate = true` |

Both routes require `Authorization: Bearer {CRON_SECRET}`.

## Data model

Tables in `019_social.sql` (RLS disabled + grants, per project convention):

| Table | Key columns |
|---|---|
| `social_accounts` | `id`, `tenant_id`, `platform` (instagram/facebook), `name`, `username`, `avatar_url`, `access_token` (AES-encrypted), `token_expires_at`, `status` (active/error), `platform_account_id` |
| `social_posts` | `id`, `tenant_id`, `caption`, `hashtags[]`, `media_urls[]`, `status` (draft/ready/scheduled/publishing/published/failed), `source` (manual/ai), `scheduled_at`, `published_at`, `ai_source_title`, `ai_source_url` |
| `social_post_targets` | `id`, `post_id`, `social_account_id`, `status`, `permalink`, `platform_post_id`, `error_message` |
| `social_settings` | `id`, `tenant_id`, `auto_generate`, `autopublish`, `niche`, `keywords[]`, `tone`, `post_count_per_run` |

## API routes

| Method + Path | Purpose |
|---|---|
| `GET /api/admin/social/accounts` | List connected accounts |
| `DELETE /api/admin/social/accounts/[id]` | Disconnect account |
| `POST /api/admin/social/connect` | Connect a platform (mock seed or OAuth redirect) |
| `GET /api/admin/social/posts` | List posts (`?status=...`) |
| `POST /api/admin/social/posts` | Create post |
| `PATCH /api/admin/social/posts/[id]` | Update / approve / schedule / publish_now |
| `DELETE /api/admin/social/posts/[id]` | Delete post |
| `POST /api/admin/social/generate` | AI generate a draft |
| `GET/PUT /api/admin/social/settings` | Read / update tenant settings |
| `POST /api/admin/social/upload` | Upload media, returns public URL |
| `GET /api/social/meta/start` | Begin Meta OAuth |
| `GET /api/social/meta/callback` | Meta OAuth callback — exchanges code, stores encrypted token |
| `GET /api/cron/social-publish` | Publish scheduled posts (cron, requires CRON_SECRET) |
| `GET /api/cron/social-discover` | AI discovery run (cron, requires CRON_SECRET) |

## Notes / future

- X/Twitter, LinkedIn, YouTube are stubbed with "Coming soon" chips. Adding support means implementing a new `SocialProvider` and registering it in `getProvider`.
- Token refresh for long-lived Meta tokens is handled in `meta.ts`; short-lived tokens (< 7 days remaining) are refreshed on the next publish attempt.
- Live previews for X and LinkedIn are stub components (`x-preview.tsx`, `linkedin-preview.tsx`) — not yet wired to the Composer preview switcher.
- See [KNOWN_ISSUES.md](../../docs/KNOWN_ISSUES.md) for the Meta App Review blocker and the Instagram Business account requirement.
