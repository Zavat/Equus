/*
  # Add RLS policies for appointment_horses table

  1. Changes
    - Add policy allowing farriers to INSERT horses to their appointments
    - Add policy allowing farriers to UPDATE appointment horses
    - Add policy allowing farriers to DELETE appointment horses
    - Add policy allowing customers to view their appointment horses

  2. Security
    - Farriers can only manage horses for their own appointments
    - Customers can view horses for their appointments
    - All policies verify authentication and proper relationships
*/

-- Policy: Farriers can add horses to their appointments
CREATE POLICY "Farriers can add horses to their appointments"
  ON appointment_horses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM appointments a
      INNER JOIN profiles farrier_profile ON a.farrier_profile_id = farrier_profile.id
      WHERE a.id = appointment_horses.appointment_id
        AND farrier_profile.user_id = auth.uid()
    )
  );

-- Policy: Farriers can update horses in their appointments
CREATE POLICY "Farriers can update horses in their appointments"
  ON appointment_horses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM appointments a
      INNER JOIN profiles farrier_profile ON a.farrier_profile_id = farrier_profile.id
      WHERE a.id = appointment_horses.appointment_id
        AND farrier_profile.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM appointments a
      INNER JOIN profiles farrier_profile ON a.farrier_profile_id = farrier_profile.id
      WHERE a.id = appointment_horses.appointment_id
        AND farrier_profile.user_id = auth.uid()
    )
  );

-- Policy: Farriers can delete horses from their appointments
CREATE POLICY "Farriers can delete horses from their appointments"
  ON appointment_horses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM appointments a
      INNER JOIN profiles farrier_profile ON a.farrier_profile_id = farrier_profile.id
      WHERE a.id = appointment_horses.appointment_id
        AND farrier_profile.user_id = auth.uid()
    )
  );

-- Policy: Customers can view horses in their appointments
CREATE POLICY "Customers can view horses in their appointments"
  ON appointment_horses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM appointments a
      INNER JOIN profiles customer_profile ON a.client_profile_id = customer_profile.id
      WHERE a.id = appointment_horses.appointment_id
        AND customer_profile.user_id = auth.uid()
    )
  );
