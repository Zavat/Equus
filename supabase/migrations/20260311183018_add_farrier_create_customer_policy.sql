/*
  # Add Farrier Customer Creation Policy

  ## Summary
  Allows farriers to create customer profiles for clients who don't have accounts yet.

  ## Changes
  - Add policy for farriers to insert customer profiles with created_by set to their profile ID

  ## Security Notes
  - Farriers can only create profiles where they are marked as created_by
  - Profiles must have source='farrier' and role='customer'
*/

-- Farriers can create customer profiles
CREATE POLICY "Farriers can create customer profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    source = 'farrier' 
    AND role = 'customer'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.id = profiles.created_by
    )
  );
