/*
  # Fix infinite recursion in "Users can view related profiles" policy

  ## Summary
  The SELECT policy for viewing related profiles still has recursion
  because it queries profiles table within profiles policies.

  ## Changes
  - Drop "Users can view related profiles" policy
  - Recreate it using get_user_profile_id() function
  - Remove all subqueries that cause recursion
  - Use correct column name: client_profile_id

  ## Security Notes
  - Maintains same security level
  - Eliminates all recursion in profiles policies
*/

-- Drop the policy that still causes recursion
DROP POLICY IF EXISTS "Users can view related profiles" ON profiles;

-- Recreate without recursion using helper function
CREATE POLICY "Users can view related profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT fcr.client_profile_id 
      FROM farrier_customer_relations fcr
      WHERE fcr.farrier_profile_id = get_user_profile_id()
    )
    OR
    id IN (
      SELECT fcr.farrier_profile_id 
      FROM farrier_customer_relations fcr
      WHERE fcr.client_profile_id = get_user_profile_id()
    )
  );
