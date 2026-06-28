-- Removes everything seed.sql created, plus any rows the functional specs wrote
-- (pages, enquiries) for the sandbox tenant. Run after the functional suite.
with t as (select id from public.tenants where slug='e2e-sandbox')
, d_enq as (delete from public.contact_enquiries where tenant_id in (select id from t) returning 1)
, d_pages as (delete from public.custom_pages where tenant_id in (select id from t) returning 1)
, d_subs as (delete from public.subscriptions where tenant_id in (select id from t) returning 1)
, d_member as (delete from public.users where tenant_id in (select id from t) returning 1)
, d_tenant as (delete from public.tenants where slug='e2e-sandbox' returning 1)
, d_email as (delete from public.users where email ilike '%@e2e.test' returning 1)
select
  (select count(*) from d_enq) as enquiries_deleted,
  (select count(*) from d_pages) as pages_deleted,
  (select count(*) from d_subs) as subs_deleted,
  (select count(*) from d_member) as member_users_deleted,
  (select count(*) from d_tenant) as tenants_deleted,
  (select count(*) from d_email) as email_users_deleted;
