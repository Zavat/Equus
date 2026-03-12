/*
  # Add RLS policies for farriers to manage customer horses

  1. Changes
    - Add policy allowing farriers to INSERT horses for their customers
    - Add policy allowing farriers to SELECT horses of their customers
    - Add policy allowing farriers to UPDATE horses of their customers
    - Add policy allowing farriers to DELETE horses of their customers

  2. Security
    - Policies verify that a farrier_customer_relations exists between the farrier and the customer
    - All policies check authentication and valid relationships
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Farriers can create horses for their customers" ON horses;
DROP POLICY IF EXISTS "Farriers can view horses of their customers" ON horses;
DROP POLICY IF EXISTS "Farriers can update horses of their customers" ON horses;
DROP POLICY IF EXISTS "Farriers can delete horses of their customers" ON horses;

-- Policy: Farriers can create horses for their customers
CREATE POLICY "Farriers can create horses for their customers"
  ON horses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM farrier_customer_relations fcr
      INNER JOIN profiles farrier_profile ON fcr.farrier_profile_id = farrier_profile.id
      WHERE fcr.client_profile_id = horses.owner_profile_id
        AND farrier_profile.user_id = auth.uid()
        AND fcr.status = 'active'
    )
  );

-- Policy: Farriers can view horses of their customers
CREATE POLICY "Farriers can view horses of their customers"
  ON horses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM farrier_customer_relations fcr
      INNER JOIN profiles farrier_profile ON fcr.farrier_profile_id = farrier_profile.id
      WHERE fcr.client_profile_id = horses.owner_profile_id
        AND farrier_profile.user_id = auth.uid()
        AND fcr.status = 'active'
    )
  );

-- Policy: Farriers can update horses of their customers
CREATE POLICY "Farriers can update horses of their customers"
  ON horses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM farrier_customer_relations fcr
      INNER JOIN profiles farrier_profile ON fcr.farrier_profile_id = farrier_profile.id
      WHERE fcr.client_profile_id = horses.owner_profile_id
        AND farrier_profile.user_id = auth.uid()
        AND fcr.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM farrier_customer_relations fcr
      INNER JOIN profiles farrier_profile ON fcr.farrier_profile_id = farrier_profile.id
      WHERE fcr.client_profile_id = horses.owner_profile_id
        AND farrier_profile.user_id = auth.uid()
        AND fcr.status = 'active'
    )
  );

-- Policy: Farriers can delete horses of their customers
CREATE POLICY "Farriers can delete horses of their customers"
  ON horses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM farrier_customer_relations fcr
      INNER JOIN profiles farrier_profile ON fcr.farrier_profile_id = farrier_profile.id
      WHERE fcr.client_profile_id = horses.owner_profile_id
        AND farrier_profile.user_id = auth.uid()
        AND fcr.status = 'active'
    )
  );
