-- Social Media Management foundation.
-- Provides social_accounts, social_posts, social_post_targets, social_settings.
-- No RLS — service-role server client + app-level auth + grants only.
-- touch_updated_at() is already defined in migration 002.

-- ── social_accounts ──────────────────────────────────────────────────────────

create table if not exists public.social_accounts (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid references public.tenants(id) on delete cascade,
  platform         text not null check (platform in ('facebook', 'instagram')),
  external_id      text not null,
  name             text not null,
  username         text,
  avatar_url       text,
  access_token_enc text,
  token_expires_at timestamptz,
  scopes           text[] not null default '{}',
  status           text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  meta             jsonb not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (tenant_id, platform, external_id)
);

create index if not exists social_accounts_tenant_idx on public.social_accounts (tenant_id);

drop trigger if exists social_accounts_touch on public.social_accounts;
create trigger social_accounts_touch
  before update on public.social_accounts
  for each row execute function public.touch_updated_at();

grant all privileges on table public.social_accounts to anon, authenticated, service_role;

-- ── social_posts ─────────────────────────────────────────────────────────────

create table if not exists public.social_posts (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid references public.tenants(id) on delete cascade,
  status           text not null default 'draft' check (status in ('draft', 'ready', 'scheduled', 'publishing', 'published', 'failed')),
  source           text not null default 'manual' check (source in ('manual', 'ai')),
  caption          text not null default '',
  hashtags         text[] not null default '{}',
  media_urls       text[] not null default '{}',
  scheduled_at     timestamptz,
  published_at     timestamptz,
  ai_source_url    text,
  ai_source_title  text,
  error            text,
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists social_posts_tenant_status_idx on public.social_posts (tenant_id, status);
create index if not exists social_posts_scheduled_idx on public.social_posts (scheduled_at);

drop trigger if exists social_posts_touch on public.social_posts;
create trigger social_posts_touch
  before update on public.social_posts
  for each row execute function public.touch_updated_at();

grant all privileges on table public.social_posts to anon, authenticated, service_role;

-- ── social_post_targets ───────────────────────────────────────────────────────

create table if not exists public.social_post_targets (
  id                uuid primary key default gen_random_uuid(),
  post_id           uuid references public.social_posts(id) on delete cascade,
  social_account_id uuid references public.social_accounts(id) on delete cascade,
  status            text not null default 'pending' check (status in ('pending', 'published', 'failed')),
  external_post_id  text,
  permalink         text,
  error             text,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists social_post_targets_post_idx on public.social_post_targets (post_id);

drop trigger if exists social_post_targets_touch on public.social_post_targets;
create trigger social_post_targets_touch
  before update on public.social_post_targets
  for each row execute function public.touch_updated_at();

grant all privileges on table public.social_post_targets to anon, authenticated, service_role;

-- ── social_settings ───────────────────────────────────────────────────────────
-- One row per tenant (tenant_id is the PK). No separate id column.

create table if not exists public.social_settings (
  tenant_id          uuid primary key references public.tenants(id) on delete cascade,
  auto_generate      boolean not null default false,
  keywords           text[] not null default '{}',
  niche              text,
  tone               text default 'friendly',
  post_count_per_run int not null default 1,
  autopublish        boolean not null default false,
  last_run_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

drop trigger if exists social_settings_touch on public.social_settings;
create trigger social_settings_touch
  before update on public.social_settings
  for each row execute function public.touch_updated_at();

grant all privileges on table public.social_settings to anon, authenticated, service_role;
