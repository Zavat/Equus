/*
  # Enable RLS and Create Security Policies

  ## Summary
  Enables Row Level Security on all tables and creates appropriate policies
  for secure data access based on user authentication and ownership.

  ## Changes
  1. Enable RLS on all tables:
    - people
    - profiles
    - horses
    - appointments
    - farrier_customer_relations
    - profile_invitations
    - add_ons
    - appointment_horses
    - appointment_modifications
    - payments
    - invoices
    - audit_logs
    - horse_photos

  2. Create policies for profiles table:
    - Users can view their own profile
    - Users can update their own profile
    - Users can insert their own profile (for manual creation)
    - Farriers can view customer profiles they are linked to

  3. Create policies for people table:
    - Users can view people records linked to their profile
    - Users can update people records linked to their profile
    - Users can insert people records

  4. Create policies for horses table:
    - Users can view horses they own
    - Users can create horses
    - Users can update horses they own

  ## Security Notes
  - All policies use auth.uid() for authentication
  - Policies are restrictive by default
  - Each table has specific access patterns based on business logic
*/

-- Enable RLS on all tables
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE horses ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE farrier_customer_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_horses ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_modifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE horse_photos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can insert their own profile (for edge cases)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Farriers can view customer profiles they manage
CREATE POLICY "Farriers can view customer profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM farrier_customer_relations fcr
      INNER JOIN profiles p ON p.id = fcr.farrier_profile_id
      WHERE p.user_id = auth.uid()
      AND fcr.client_profile_id = profiles.id
    )
  );

-- Customers can view their farrier profiles
CREATE POLICY "Customers can view farrier profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM farrier_customer_relations fcr
      INNER JOIN profiles p ON p.id = fcr.client_profile_id
      WHERE p.user_id = auth.uid()
      AND fcr.farrier_profile_id = profiles.id
    )
  );

-- ============================================
-- PEOPLE POLICIES
-- ============================================

-- Users can view people records linked to their profile
CREATE POLICY "Users can view linked people"
  ON people FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.person_id = people.id
      AND profiles.user_id = auth.uid()
    )
  );

-- Users can update people records linked to their profile
CREATE POLICY "Users can update linked people"
  ON people FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.person_id = people.id
      AND profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.person_id = people.id
      AND profiles.user_id = auth.uid()
    )
  );

-- Users can insert people records
CREATE POLICY "Users can insert people"
  ON people FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- HORSES POLICIES
-- ============================================

-- Users can view horses they own
CREATE POLICY "Users can view own horses"
  ON horses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = horses.owner_profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Users can create horses
CREATE POLICY "Users can create horses"
  ON horses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = horses.owner_profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Users can update horses they own
CREATE POLICY "Users can update own horses"
  ON horses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = horses.owner_profile_id
      AND profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = horses.owner_profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Users can delete horses they own
CREATE POLICY "Users can delete own horses"
  ON horses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = horses.owner_profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- ============================================
-- APPOINTMENTS POLICIES
-- ============================================

-- Users can view appointments where they are farrier or client
CREATE POLICY "Users can view own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (profiles.id = appointments.farrier_profile_id OR profiles.id = appointments.client_profile_id)
    )
  );

-- Users can create appointments
CREATE POLICY "Users can create appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (profiles.id = appointments.farrier_profile_id OR profiles.id = appointments.client_profile_id)
    )
  );

-- Users can update appointments they are part of
CREATE POLICY "Users can update own appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (profiles.id = appointments.farrier_profile_id OR profiles.id = appointments.client_profile_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (profiles.id = appointments.farrier_profile_id OR profiles.id = appointments.client_profile_id)
    )
  );

-- ============================================
-- FARRIER_CUSTOMER_RELATIONS POLICIES
-- ============================================

CREATE POLICY "Users can view their relations"
  ON farrier_customer_relations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (profiles.id = farrier_customer_relations.farrier_profile_id 
           OR profiles.id = farrier_customer_relations.client_profile_id)
    )
  );

CREATE POLICY "Farriers can create relations"
  ON farrier_customer_relations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.id = farrier_customer_relations.farrier_profile_id
    )
  );

-- ============================================
-- OTHER TABLES - BASIC POLICIES
-- ============================================

-- Profile invitations
CREATE POLICY "Users can view invitations for their profiles"
  ON profile_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (profiles.id = profile_invitations.farrier_profile_id OR profiles.id = profile_invitations.profile_id)
    )
  );

-- Add-ons
CREATE POLICY "Farriers can manage their add-ons"
  ON add_ons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.id = add_ons.farrier_profile_id
    )
  );

-- Appointment horses
CREATE POLICY "Users can view appointment horses"
  ON appointment_horses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      INNER JOIN profiles p ON p.user_id = auth.uid()
      WHERE a.id = appointment_horses.appointment_id
      AND (p.id = a.farrier_profile_id OR p.id = a.client_profile_id)
    )
  );

-- Horse photos
CREATE POLICY "Users can view photos of their horses"
  ON horse_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM horses h
      INNER JOIN profiles p ON p.id = h.owner_profile_id
      WHERE h.id = horse_photos.horse_id
      AND p.user_id = auth.uid()
    )
  );

-- Payments
CREATE POLICY "Users can view their payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.id = payments.payer_id
    )
    OR
    EXISTS (
      SELECT 1 FROM appointments a
      INNER JOIN profiles p ON p.id = a.farrier_profile_id
      WHERE a.id = payments.appointment_id
      AND p.user_id = auth.uid()
    )
  );

-- Invoices
CREATE POLICY "Users can view their invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      INNER JOIN profiles p ON p.user_id = auth.uid()
      WHERE a.id = invoices.appointment_id
      AND (p.id = a.farrier_profile_id OR p.id = a.client_profile_id)
    )
  );

-- Audit logs
CREATE POLICY "Users can view audit logs for their actions"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.id = audit_logs.actor_profile_id
    )
  );
