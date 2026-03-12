/*
  # Drop duplicate and recursive INSERT policies

  ## Summary
  There are multiple INSERT policies on profiles table, including
  old ones that still use recursive subqueries.

  ## Changes
  - Drop "insert profiles" policy (has recursion)
  - Drop "Authenticated can insert profiles" policy (too permissive)
  - Keep only:
    - "Users can insert own profile" (for account creation)
    - "Farriers can create customer profiles" (for farrier->customer)

  ## Security Notes
  - Removes duplicate policies
  - Eliminates recursion source
  - Maintains proper access control
*/

-- Drop old policies that cause issues
DROP POLICY IF EXISTS "insert profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated can insert profiles" ON profiles;

-- Make sure we have the correct policies
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Recreate clean policy for user account creation
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
