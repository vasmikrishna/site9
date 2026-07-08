# Auth — Login page

Custom email + password authentication (no Supabase Auth). Session stored as a
signed JWT cookie scoped to the parent domain in production.

## Surfaces

| Path | Purpose |
|------|---------|
| `/login` | Main login page (email + password + phone) |
| `/start` | Registration / onboarding (step 2 has password field) |
| `GET /api/auth/google` | Google OAuth entry point |
| `GET /api/auth/google/callback` | OAuth callback; sets `needsPhone` when the Gmail account has no number and routes to `/complete-profile` |
| `POST /api/auth/login` | Authenticates email + password; returns role/slug |
| `POST /api/auth/select-workspace` | Finalises login when user belongs to multiple tenants |
| `/complete-profile` | Required mobile-number step for Gmail sign-ins missing a phone (#22) |
| `POST /api/auth/phone` | Saves the signed-in user's `phone`, clears `needsPhone`, re-issues the session |

## Login form fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Email | `email` | Yes | Identifies the user across tenants |
| Password | `password` / `text` | Yes | Show/hide toggle (eye icon button, `data-testid="login-password-toggle"`) |
| Phone number | `tel` | No | Optional; stored on the user record on login (collect & store only — not a login method) |

## Show/hide password toggle

Implemented as an absolutely-positioned `<button type="button">` inside a
`relative` wrapper around the `<Input>`. Uses Lucide `Eye` / `EyeOff` icons.
Toggle flips the input `type` between `"password"` and `"text"`.

The same toggle is present on the `/start` registration form
(`data-testid="start-password-toggle"`).

## Phone number field

The phone field is **optional** and rendered below the password field. It is
included in the `POST /api/auth/login` JSON payload when non-empty.

**Behaviour (collect & store only):** login still authenticates by email +
password. Once credentials check out, the route persists the phone onto the
matched user record(s) — on the tenant subdomain path it updates that single
user; on the main-domain path it updates every account the password matched
(the same person across their workspaces). It is **not** a login method.

Migration `017_user_phone.sql` adds the `phone text` column to `public.users`
(no new grants needed — existing table grants cover the column). A future OTP /
SMS feature can build on this column without further frontend changes.

## Google sign-in — required mobile capture (#22)

Google OAuth never returns a phone number, so Gmail accounts would otherwise have
`users.phone = null`. The callback selects the user's `phone`; when it is missing
(new signup, or an existing Google user who never provided one) it sets
`needsPhone: true` in the session JWT and redirects to `/complete-profile` instead
of `/dashboard`.

`/complete-profile` has one required "Mobile number" field. `POST /api/auth/phone`
validates it (non-empty, ≥ 7 digits), saves it to `users.phone` by email, then
re-issues the session **without** `needsPhone`. While the flag is set, middleware
funnels every management route back to `/complete-profile` (allowing only that
page, `/api/auth/phone`, and `/api/auth/logout`) so the step cannot be skipped.
Super-admin sessions never carry the flag. Unlike the optional login-form phone
above, this step is **mandatory** before a Gmail user reaches the app.

## data-testid catalogue

| Element | testid |
|---------|--------|
| Complete-profile phone input | `complete-profile-phone` |
| Complete-profile submit | `complete-profile-submit` |
| Email input | `login-email` |
| Password input | `login-password` |
| Password show/hide toggle | `login-password-toggle` |
| Phone input | `login-phone` |
| Submit button | `login-submit` |
| Start page password input | `start-password` |
| Start page password toggle | `start-password-toggle` |
