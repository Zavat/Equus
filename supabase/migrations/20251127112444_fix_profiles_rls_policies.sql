/*
  # Fix RLS Policies for Profiles Table
  
  1. Changes
    - Drop problematic recursive policy for farriers viewing customers
    - Create simpler, non-recursive policy using auth.uid() directly
    - Ensure all policies avoid checking profiles table within profiles policies
  
  2. Security
    - Users can view and update their own profile
    - Farriers can view profiles of users who have appointments with them
    - No recursive queries that cause infinite loops
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Farriers can view their customers" ON profiles;

-- Recreate with a simpler approach that doesn't query profiles recursively
CREATE POLICY "Farriers can view their customers"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- User can see their own profile OR
    -- User is a customer of the authenticated farrier
    auth.uid() = id 
    OR id IN (
      SELECT customer_id 
      FROM appointments 
      WHERE farrier_id = auth.uid()
    )
  );
