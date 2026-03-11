/*
  # Fix People Insert Policy

  ## Summary
  Fixes the people table insert policy to allow authenticated users to insert records.

  ## Changes
  - Drop existing people insert policy
  - Create new policy that properly allows authenticated users to insert

  ## Security Notes
  - Any authenticated user can create people records
  - This is needed for account creation flow
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can insert people" ON people;

-- Allow authenticated users to insert people
CREATE POLICY "Authenticated users can insert people"
  ON people FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
