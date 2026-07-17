-- 022_one_user_row_per_email.sql
--
-- Ownership across the platform is resolved by email (see lib/sites.ts), but
-- `users` was only unique on (email, tenant_id). Because every signup mints a
-- fresh tenant first, /api/onboarding/create could insert a SECOND row for an
-- email that already had an account — with an attacker-chosen password — and
-- logging in with it inherited every site on that email.
--
-- The app-level gate is the primary fix. This migration closes the race window
-- underneath it: two concurrent signups on the same new email can still both
-- pass an app-level check and insert. A unique index makes that impossible.
--
-- Before the index can exist, each email must collapse to one row. The observed
-- shape of every duplicate is:
--   • an older Google row  — no password_hash, tenant_id NULL, OWNS the sites
--   • a newer /start row   — has password_hash + tenant_id, owns nothing
-- so the merge keeps the site-owning row and folds the password onto it, which
-- preserves BOTH sign-in methods. Written generically rather than against those
-- specific ids, so it stays correct whenever it is applied.

begin;

-- Pick one surviving row per email: prefer the one that owns sites, then the
-- one with a password, then the oldest. Everything else folds into it.
create temporary table _email_merge on commit drop as
with ranked as (
  select
    u.id,
    lower(u.email) as email_key,
    u.password_hash,
    u.phone,
    u.plan,
    row_number() over (
      partition by lower(u.email)
      order by
        (select count(*) from public.tenants t where t.owner_user_id = u.id) desc,
        (u.password_hash is not null) desc,
        u.created_at asc
    ) as rn
  from public.users u
)
select
  r.id        as loser_id,
  k.id        as keeper_id,
  r.password_hash as loser_password_hash,
  r.phone     as loser_phone,
  r.plan      as loser_plan
from ranked r
join ranked k on k.email_key = r.email_key and k.rn = 1
where r.rn > 1;

-- Preserve the password (and phone/plan) from the folded row so the person can
-- still sign in the way they did before. Only fills gaps — never overwrites.
update public.users u
set password_hash = coalesce(u.password_hash, m.loser_password_hash),
    phone         = coalesce(u.phone, m.loser_phone),
    plan          = case when u.plan = 'business' or m.loser_plan = 'business'
                        then 'business' else u.plan end
from _email_merge m
where u.id = m.keeper_id;

-- Re-point every foreign key that references the folded rows.
update public.tenants             t set owner_user_id = m.keeper_id from _email_merge m where t.owner_user_id = m.loser_id;
update public.audit_logs          x set user_id       = m.keeper_id from _email_merge m where x.user_id       = m.loser_id;
update public.bookings            x set customer_id   = m.keeper_id from _email_merge m where x.customer_id   = m.loser_id;
update public.orders              x set customer_id   = m.keeper_id from _email_merge m where x.customer_id   = m.loser_id;
update public.project_assignments x set assigned_by   = m.keeper_id from _email_merge m where x.assigned_by   = m.loser_id;
update public.project_assignments x set employee_id   = m.keeper_id from _email_merge m where x.employee_id   = m.loser_id;
update public.projects            x set client_id     = m.keeper_id from _email_merge m where x.client_id     = m.loser_id;
update public.survey_submissions  x set respondent_id = m.keeper_id from _email_merge m where x.respondent_id = m.loser_id;
update public.surveys             x set created_by    = m.keeper_id from _email_merge m where x.created_by    = m.loser_id;

delete from public.users u using _email_merge m where u.id = m.loser_id;

-- Normalise casing so the index below can't be sidestepped by capitalisation.
update public.users set email = lower(email) where email <> lower(email);

-- The actual guarantee: one account per email, platform-wide. This is what the
-- old UNIQUE (email, tenant_id) failed to provide.
create unique index if not exists users_email_lower_unique on public.users (lower(email));

-- The per-tenant constraint is now redundant and would still permit a duplicate
-- if the index above were ever dropped. Superseded.
alter table public.users drop constraint if exists users_email_tenant_unique;

commit;
