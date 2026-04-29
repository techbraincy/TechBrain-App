-- ============================================================
-- 008 System role: adds super_admin capability to profiles
-- ============================================================

-- New enum type (separate from business_role which stays as-is)
CREATE TYPE public.system_role AS ENUM ('user', 'super_admin');

-- Add column with safe default so all existing rows backfill as 'user'
ALTER TABLE public.profiles
  ADD COLUMN system_role public.system_role NOT NULL DEFAULT 'user';

-- Partial index: super_admin lookups are rare but must be fast
CREATE INDEX idx_profiles_system_role
  ON public.profiles (system_role)
  WHERE system_role = 'super_admin';

-- RLS: super_admins can read all profiles (needed for future platform admin UI).
-- The existing "users_read_own_profile" policy already covers self-reads;
-- this policy adds the super_admin cross-read path. Supabase ORs multiple policies.
CREATE POLICY "super_admins_read_all_profiles" ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.system_role = 'super_admin'
    )
  );
