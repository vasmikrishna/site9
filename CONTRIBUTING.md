# Contributing to Site9

Thanks for your interest in contributing to Site9! We want to make it easy and welcoming for everyone to help build the best website builder for small businesses.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Reporting Security Issues](#reporting-security-issues)

## Code of Conduct

This project follows a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to hello@site9.in.

## How Can I Contribute?

### Templates

Site9 ships 100+ business templates across 8 style families. Contributing new templates is one of the most impactful ways to help:

- Create templates for underserved business types
- Improve existing templates (accessibility, responsiveness, design)
- Add new style families

### Features

- Page builder improvements
- SEO and analytics enhancements
- Booking system, shop, and blog modules
- Social media integrations
- Accessibility improvements

### Bug Fixes

- Check [open issues](https://github.com/vasmikrishna/site9/issues) for bugs labeled `good first issue`
- Reproduce the bug locally before fixing
- Write a test that captures the bug before fixing it

### Documentation

- Improve README, wiki, or inline docs
- Write guides for self-hosting or contributing templates
- Translate documentation

### Testing

- Write Playwright e2e tests for critical paths
- Improve test coverage for API routes
- Report bugs with clear reproduction steps

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (required, not npm or yarn)
- A Supabase project (free tier works)
- Git

### Setup

1. Fork the repository on GitHub
2. Clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/site9.git
cd site9
```

3. Install dependencies:

```bash
pnpm install
```

4. Copy the example environment file and fill in your keys:

```bash
cp social.env.example .env.local
```

You'll need at minimum:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from your Supabase project)
- `SUPABASE_SERVICE_ROLE_KEY` (from Supabase project settings)
- `SESSION_SECRET` (generate with `openssl rand -base64 32`)

5. Run the database migrations against your Supabase project.

6. Start the dev server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Development Workflow

1. **Create an issue first** -- every bug fix or feature must have a GitHub issue before work begins.
2. **Create a branch** from `main` with the naming convention:
   - Bug fixes: `fix/{issue-number}-{short-description}`
   - Features: `feature/{issue-number}-{short-description}`
3. Make your changes, following the coding standards below.
4. Write or update tests as needed.
5. Push your branch and open a pull request.

## Pull Request Process

1. **Link the issue** -- your PR description must include `Closes #{issue-number}`.
2. **Describe what changed** and why. Include screenshots for UI changes.
3. **Ensure CI passes** -- TypeScript compilation, linting, and tests must all pass.
4. **One approval required** -- a maintainer will review your PR.
5. **Keep PRs focused** -- one issue per PR. Don't bundle unrelated changes.

### PR Checklist

- [ ] Linked to a GitHub issue (`Closes #...`)
- [ ] Branch follows naming convention (`fix/` or `feature/` + issue number)
- [ ] TypeScript compiles with no errors (`pnpm build`)
- [ ] No `any` types introduced
- [ ] Interactive UI elements have `data-testid` attributes
- [ ] Tests added or updated for the change
- [ ] No hardcoded secrets or credentials
- [ ] Responsive design verified on mobile

## Coding Standards

### Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router), TypeScript (strict) |
| Styling | Tailwind CSS v4, shadcn/ui |
| Database | Supabase (Postgres only -- never use Supabase Auth) |
| Auth | Custom JWT via `jose`, HTTP-only cookies |
| Package manager | pnpm |

### Rules

- **TypeScript strict mode** -- no `any` type, no `@ts-ignore`
- **Supabase is database only** -- never use Supabase Auth
- **Every interactive UI element** must have a `data-testid` attribute
- **Tailwind + shadcn/ui** for all styling -- no custom CSS frameworks
- **pnpm only** -- do not commit `package-lock.json` or `yarn.lock`
- **No secrets in code** -- all credentials go in `.env.local` (gitignored)

### File Organization

- Pages go in `src/app/` following the existing route group structure
- Shared components go in `src/components/`
- Utility functions go in `src/lib/`
- Types go in `src/types/`

## Reporting Security Issues

Do **not** open a public issue for security vulnerabilities. Instead, please email hello@site9.in with the details. See [SECURITY.md](SECURITY.md) for our full security policy.

## License

By contributing to Site9, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).

## Questions?

Open a [discussion](https://github.com/vasmikrishna/site9/discussions) or email hello@site9.in.
