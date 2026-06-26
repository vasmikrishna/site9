-- Global account model: a user (identified by email) owns many sites (tenants).
-- Non-destructive: add ownership column + backfill from each tenant's admin user.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

UPDATE public.tenants t
SET owner_user_id = (
  SELECT u.id FROM public.users u
  WHERE u.tenant_id = t.id
  ORDER BY (u.role = 'admin') DESC NULLS LAST, u.created_at ASC NULLS LAST, u.id
  LIMIT 1
)
WHERE owner_user_id IS NULL;

CREATE INDEX IF NOT EXISTS tenants_owner_user_id_idx ON public.tenants (owner_user_id);
