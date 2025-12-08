-- Fix RLS Policies for GhostInbox
-- Run this in your Supabase SQL Editor if you're getting RLS policy errors

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Profiles: user can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: public can select" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: user can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: user can update own profile" ON public.profiles;

-- Recreate Profiles policies
-- Public can read profiles (needed for /v/:slug to show handle)
CREATE POLICY "Profiles: public can select"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Users can insert their own profile (during signup)
-- This requires auth.uid() to match the id being inserted
CREATE POLICY "Profiles: user can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Profiles: user can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Verify policies are created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

