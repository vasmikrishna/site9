# Security Policy

## Supported Versions

| Version | Supported |
| --- | --- |
| main branch | Yes |
| All other branches | No |

## Reporting a Vulnerability

If you discover a security vulnerability in Site9, please report it responsibly. **Do not open a public GitHub issue.**

### How to Report

Email **hello@site9.in** with:

1. A description of the vulnerability
2. Steps to reproduce
3. The potential impact
4. Any suggested fixes (optional)

### What to Expect

- **Acknowledgment** within 48 hours of your report
- **Assessment** within 7 days -- we'll confirm the issue and its severity
- **Fix timeline** based on severity:
  - Critical: patched within 48 hours
  - High: patched within 7 days
  - Medium/Low: included in the next release
- **Credit** in the release notes (unless you prefer to remain anonymous)

### Scope

The following are in scope:

- Authentication and session management
- Authorization and access control (tenant isolation, role enforcement)
- Data exposure (API routes leaking data across tenants)
- Injection vulnerabilities (SQL injection, XSS, CSRF)
- Secrets or credentials accidentally committed to the repository
- Cryptographic issues (weak hashing, predictable tokens)

The following are out of scope:

- Denial of service attacks
- Social engineering
- Issues in third-party dependencies (report upstream, but let us know)
- Issues requiring physical access to a user's device

## Security Architecture

Site9 is a multi-tenant application. Key security design decisions:

- **Auth**: Custom JWT via `jose` with HTTP-only session cookies. Passwords hashed with bcrypt (12 rounds). No Supabase Auth.
- **Tenant isolation**: Middleware enforces that a session cookie is only valid for the tenant whose subdomain it was issued on. Cross-tenant requests are rejected.
- **Database**: Supabase Postgres with service-role key server-side. All queries include tenant_id filtering.
- **Secrets**: All credentials stored in environment variables, never committed to the repository. `.env*` files are gitignored.
- **Content sanitization**: User-generated HTML/CSS is sanitized before rendering.

## Self-Hosting Security Checklist

If you self-host Site9, ensure:

- [ ] `SESSION_SECRET` is a strong random value (at least 32 bytes): `openssl rand -base64 32`
- [ ] `ADMIN_PASSWORD` is strong and unique (not the default)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is never exposed to the client
- [ ] `.env.local` is not committed to version control
- [ ] HTTPS is enabled in production
- [ ] Database backups are configured
- [ ] Supabase RLS policies are reviewed for your deployment
