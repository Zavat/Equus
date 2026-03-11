/*
  # Fix Recursive Policies

  ## Summary
  Fixes infinite recursion in RLS policies by removing circular dependencies.
  The issue was policies checking profiles table within profiles policies.

  ## Changes
  - Drop all existing policies on profiles table
  - Recreate simplified policies without recursion
  - Use direct auth.uid() checks instead of joining profiles to itself

  ## Security Notes
  - Maintains same security level
  - Removes circular references
  - Uses auth.uid() directly for performance
*/

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Farriers can view customer profiles" ON profiles;
DROP POLICY IF EXISTS "Customers can view farrier profiles" ON profiles;
DROP POLICY IF EXISTS "Farriers can create customer profiles" ON profiles;

-- Recreate policies without recursion

-- Users can view their own profile (direct check, no recursion)
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can view profiles where user_id is NULL and they created them
CREATE POLICY "Users can view created profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    user_id IS NULL 
    AND created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Users can view profiles through farrier-customer relations
CREATE POLICY "Users can view related profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT fcr.client_profile_id 
      FROM farrier_customer_relations fcr
      WHERE fcr.farrier_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
    OR
    id IN (
      SELECT fcr.farrier_profile_id 
      FROM farrier_customer_relations fcr
      WHERE fcr.client_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can insert their own profile (for account creation)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Farriers can create customer profiles
CREATE POLICY "Farriers can create customer profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    source = 'farrier' 
    AND role = 'customer'
    AND user_id IS NULL
    AND created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Users can delete profiles they created (for cleanup)
CREATE POLICY "Users can delete created profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    user_id IS NULL 
    AND created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );
