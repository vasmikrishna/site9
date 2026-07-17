# Known Issues

## Accounts

### Duplicate `users` rows per email — migration written, not applied
**Status:** App-level fix shipped; DB-level uniqueness pending.

The onboarding takeover hole is closed in the app (see CHANGELOG), but the database still
allows duplicate rows per email: `users` is unique on `(email, tenant_id)`, not on the email
itself. Two **concurrent** signups on the same new email could still both pass the app check
and insert.

`src/lib/supabase/migrations/022_one_user_row_per_email.sql` fixes this properly — it merges
the remaining duplicates onto the site-owning row (keeping the password so Google *and*
password sign-in both keep working), re-points every foreign key, then adds
`unique (lower(email))`. It has **not been applied** because it touches live login rows.

Two emails are affected: `ckrishna@startensystems.com` and `vamsikrishna.chinipireddy@gmail.com`.
Each has an older Google row (no password, owns the sites) plus a newer `/start` row (has a
password, owns nothing). Dry-run the migration's ranking `SELECT` before applying.

**Workaround:** none needed for the reported bug — the app-level gate already blocks it.

## Social Media Management

### Real Instagram / Facebook posting requires a Meta App + App Review
**Status:** By design — deferred until the user creates a Facebook App.

The feature ships in mock mode (`SOCIAL_MOCK=1` or absent `META_APP_ID`). All admin UI,
scheduling, cron, and AI drafting work end-to-end with `MockProvider`. To enable real posting:

1. Create a Facebook App at [developers.facebook.com](https://developers.facebook.com).
2. Complete Meta App Review for the permissions:
   - `instagram_content_publish` — post to Instagram Business/Creator accounts.
   - `pages_manage_posts` — post to Facebook Pages.
3. Set the env vars: `META_APP_ID`, `META_APP_SECRET`, `META_OAUTH_REDIRECT`,
   `SOCIAL_TOKEN_ENC_KEY` (32-byte hex), and remove / unset `SOCIAL_MOCK`.
4. Restart the app. `getProvider()` will now return `MetaProvider` and the OAuth
   connect flow will redirect to Facebook instead of seeding a mock account.

**Workaround:** Use `SOCIAL_MOCK=1` for development, demos, and staging. All functional
paths (compose, schedule, calendar, AI generate, cron publish, cron discover) work
identically in mock mode; the only difference is that posts are not sent to Meta.

### Instagram requires a Business or Creator account linked to a Facebook Page
Instagram posts via the Graph API only work for accounts in **Business** or **Creator**
mode that are connected to a Facebook Page. Personal Instagram accounts cannot be used.
Additionally, **every Instagram post must include at least one image** — caption-only
posts are rejected by the Graph API.

**Workaround:** Ensure the user's Instagram account is converted to Business/Creator in
the Instagram app settings, and that it is linked to a Facebook Page before connecting
via OAuth.

### Migration `019_social.sql` must be applied before use
The social feature depends on four tables that are not present in older databases:
`social_accounts`, `social_posts`, `social_post_targets`, `social_settings`.

Apply the migration in the Supabase dashboard (SQL editor) or via the Supabase CLI:

```
supabase db push  # if using local dev
```

Or run the contents of `src/lib/supabase/migrations/019_social.sql` directly in the
Supabase SQL editor. The app will return 500 errors from all `/api/admin/social/*`
routes until the migration is applied.
