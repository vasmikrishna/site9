-- Seed for the functional e2e suite (e2e/functional/*.spec.ts).
-- Creates an isolated sandbox tenant + one test user per role. Safe to run
-- against a staging DB; against prod it is fully removed by cleanup.sql.
--
-- Password for all seeded users: E2eTest!2026
-- (bcryptjs cost-12 hash below — regenerate with:
--   node -e "console.log(require('bcryptjs').hashSync('E2eTest!2026',12))" )

with admin_u as (
  insert into public.users (email, name, password_hash, role, tenant_id, status, plan)
  values ('e2e-admin@e2e.test', 'E2E Admin',
          '$2b$12$f285U3OUGlrUvQ5At.fBFO0nT0cCRlNm3QNErKt6gkRZUB21Zywai',
          'admin', null, 'active', 'free')
  returning id
),
t as (
  insert into public.tenants (name, slug, industry, plan, status, primary_color, onboarding_complete, owner_user_id, settings)
  select 'E2E Sandbox', 'e2e-sandbox', 'software', 'starter', 'active', '#2B6BFF', true, admin_u.id,
         '{"business":{"name":"E2E Sandbox"}}'::jsonb
  from admin_u
  returning id
),
client_u as (
  insert into public.users (email, name, password_hash, role, tenant_id, status, plan)
  select 'e2e-client@e2e.test', 'E2E Client',
         '$2b$12$f285U3OUGlrUvQ5At.fBFO0nT0cCRlNm3QNErKt6gkRZUB21Zywai',
         'client', t.id, 'active', 'free' from t
  returning id
),
emp_u as (
  insert into public.users (email, name, password_hash, role, tenant_id, status, plan)
  select 'e2e-employee@e2e.test', 'E2E Employee',
         '$2b$12$f285U3OUGlrUvQ5At.fBFO0nT0cCRlNm3QNErKt6gkRZUB21Zywai',
         'employee', t.id, 'active', 'free' from t
  returning id
)
select (select id from admin_u) as admin_id, (select id from t) as tenant_id,
       (select id from client_u) as client_id, (select id from emp_u) as employee_id;
