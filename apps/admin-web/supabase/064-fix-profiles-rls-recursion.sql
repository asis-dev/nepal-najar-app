-- ============================================================
-- Fix infinite recursion in profiles RLS update policy
-- The old policy's WITH CHECK clause queried profiles table
-- during an UPDATE, causing PostgreSQL recursion error.
-- ============================================================

-- Drop the recursive policies
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;

-- Recreate: users can update their own profile
-- Use auth.uid() directly instead of subquerying profiles
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Recreate: admins can update any profile
-- Use auth.jwt() custom claims to check admin role without querying profiles (avoids recursion)
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (
    auth.uid() = id
    OR (auth.jwt() ->> 'role' = 'service_role')
    OR (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'verifier'))
  );
