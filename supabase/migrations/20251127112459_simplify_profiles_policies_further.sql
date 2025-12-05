/*
  # Simplify Profiles RLS Policies
  
  1. Changes
    - Drop all existing policies
    - Create minimal set of policies without recursion
    - Separate concerns: own profile access vs farrier-customer access
  
  2. Security
    - Users can always view and update their own profile
    - Users can insert their own profile on first login
    - Farriers can view customer profiles through appointments
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Farriers can view their customers" ON profiles;

-- Users can always manage their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Farriers can view customer profiles (separate policy, only for SELECT)
CREATE POLICY "Farriers can view customer profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT customer_id 
      FROM appointments 
      WHERE farrier_id = auth.uid()
    )
  );
