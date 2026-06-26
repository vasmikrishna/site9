-- Account-level plan (site quota). 'business' is a super-admin override;
-- 'pro' is otherwise derived live from an active site subscription.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';
