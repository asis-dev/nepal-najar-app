-- Fix infinite recursion on profiles SELECT policies.
--
-- profiles_select_admin did: EXISTS (SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND p.role='admin')
-- That subquery itself triggers the same RLS policies on `profiles` -> 42P17 infinite recursion.
-- Middleware's own SELECT (.eq('id', user.id)) therefore always fails, so every admin gets
-- redirected to /admin-login?error=not-admin.
--
-- Fix: drop the recursive policy. profiles_select_own (auth.uid() = id) is sufficient for
-- a user to read their own row. For admin-wide reads we rely on the service role
-- (used server-side via SUPABASE_SERVICE_ROLE_KEY) which bypasses RLS, or on a non-recursive
-- JWT-claim-based policy if needed in the future.

DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;

-- Optional: replace with a JWT-claim-based admin read policy (non-recursive).
-- Only activates if the user's app_metadata.role is explicitly set to admin/verifier.
-- This does NOT cause recursion because it doesn't query the profiles table.
CREATE POLICY "profiles_select_admin_claim"
  ON public.profiles
  FOR SELECT
  USING (
    ((auth.jwt() -> 'app_metadata') ->> 'role') IN ('admin', 'verifier')
  );
