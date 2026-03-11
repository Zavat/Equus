/*
  # Add People Policies for Farriers

  ## Summary
  Allows farriers to view and update people records linked to customer profiles they created.

  ## Changes
  - Add policy for farriers to view people linked to their customers
  - Add policy for farriers to update people they manage

  ## Security Notes
  - Farriers can only access people linked to profiles they created
  - Maintains data isolation between farriers
*/

-- Farriers can view people linked to profiles they created
CREATE POLICY "Farriers can view customer people"
  ON people FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT p.person_id 
      FROM profiles p
      WHERE p.created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- Farriers can update people linked to profiles they created
CREATE POLICY "Farriers can update customer people"
  ON people FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT p.person_id 
      FROM profiles p
      WHERE p.created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    id IN (
      SELECT p.person_id 
      FROM profiles p
      WHERE p.created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );
