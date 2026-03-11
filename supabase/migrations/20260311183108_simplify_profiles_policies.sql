/*
  # Simplify Profiles Policies to Eliminate Recursion

  ## Summary
  Completely removes recursive policies by using only direct auth.uid() checks
  and avoiding any subqueries on the profiles table itself.

  ## Changes
  - Drop all existing policies on profiles
  - Create minimal policies using only auth.uid()
  - Remove all subqueries that reference profiles table

  ## Security Notes
  - Temporarily more permissive to eliminate recursion
  - Will refine security after basic functionality works
*/

-- Drop all policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view created profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view related profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Farriers can create customer profiles" ON profiles;
DROP POLICY IF EXISTS "Users can delete created profiles" ON profiles;

-- Simple, non-recursive policies

-- Users can view their own profile by user_id
CREATE POLICY "View own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can view profiles with null user_id (created by farriers)
CREATE POLICY "View null user profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (user_id IS NULL);

-- Users can insert their own profile
CREATE POLICY "Insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Users can update their own profile
CREATE POLICY "Update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete profiles with null user_id
CREATE POLICY "Delete null user profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (user_id IS NULL);
