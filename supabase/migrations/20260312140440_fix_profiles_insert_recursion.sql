/*
  # Fix infinite recursion in profiles INSERT policies

  ## Summary
  Replaces subqueries in INSERT policies with get_user_profile_id() function
  to prevent infinite recursion when farriers create customer profiles.

  ## Changes
  - Update "Farriers can create customer profiles" policy
  - Update "Users can view created profiles" policy
  - Update "Users can delete created profiles" policy
  - Use get_user_profile_id() instead of SELECT subqueries

  ## Security Notes
  - Maintains same security level
  - Eliminates recursion issues
  - Uses SECURITY DEFINER function safely
*/

-- Drop policies that cause recursion
DROP POLICY IF EXISTS "Users can view created profiles" ON profiles;
DROP POLICY IF EXISTS "Farriers can create customer profiles" ON profiles;
DROP POLICY IF EXISTS "Users can delete created profiles" ON profiles;

-- Recreate policies without recursion using helper function

-- Users can view profiles where user_id is NULL and they created them
CREATE POLICY "Users can view created profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    user_id IS NULL 
    AND created_by = get_user_profile_id()
  );

-- Farriers can create customer profiles
CREATE POLICY "Farriers can create customer profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    source = 'farrier' 
    AND role = 'customer'
    AND user_id IS NULL
    AND created_by = get_user_profile_id()
  );

-- Users can delete profiles they created
CREATE POLICY "Users can delete created profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    user_id IS NULL 
    AND created_by = get_user_profile_id()
  );
