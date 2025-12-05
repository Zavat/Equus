/*
  # Farrier Horse Owner App - Core Schema

  ## Overview
  Complete database schema for a Farrier ↔ Horse Owner scheduling and payment platform.
  
  ## New Tables
  
  ### 1. `profiles`
  User profile data linked to auth.users
  - `id` (uuid, FK to auth.users)
  - `role` (enum: farrier, owner, stable, admin)
  - `full_name` (text)
  - `email` (text)
  - `phone` (text)
  - `address` (text)
  - `city` (text)
  - `country` (text, ISO code)
  - `latitude` (numeric)
  - `longitude` (numeric)
  - `stripe_account_id` (text, for Farriers)
  - `stripe_customer_id` (text, for Owners/Stables)
  - `language` (text, default 'en')
  - `tax_id` (text, VAT/tax number)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `horses`
  Horse records owned by Owners or managed by Stables
  - `id` (uuid, PK)
  - `owner_id` (uuid, FK to profiles)
  - `stable_id` (uuid, nullable FK to profiles)
  - `name` (text)
  - `breed` (text)
  - `age` (integer)
  - `work_type` (enum: trim, two_shoes, four_shoes)
  - `special_notes` (text)
  - `last_shoeing_date` (date)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `stable_consents`
  GDPR-compliant consent tracking for Stable → Owner relationships
  - `id` (uuid, PK)
  - `horse_id` (uuid, FK to horses)
  - `owner_id` (uuid, FK to profiles)
  - `stable_id` (uuid, FK to profiles)
  - `granted_at` (timestamptz)
  - `revoked_at` (timestamptz, nullable)
  - `status` (enum: active, revoked)
  - `created_at` (timestamptz)

  ### 4. `price_lists`
  Default pricing for Farrier services
  - `id` (uuid, PK)
  - `farrier_id` (uuid, FK to profiles)
  - `service_type` (enum: trim, two_shoes, four_shoes)
  - `base_price` (numeric)
  - `currency` (text, default 'EUR')
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. `add_ons`
  Additional services/modifications
  - `id` (uuid, PK)
  - `farrier_id` (uuid, FK to profiles)
  - `code` (text)
  - `label` (text)
  - `price` (numeric)
  - `currency` (text, default 'EUR')
  - `created_at` (timestamptz)

  ### 6. `appointments`
  Core appointment scheduling
  - `id` (uuid, PK)
  - `farrier_id` (uuid, FK to profiles)
  - `customer_id` (uuid, FK to profiles, Owner or Stable)
  - `customer_type` (enum: owner, stable)
  - `proposed_date` (timestamptz)
  - `confirmed_date` (timestamptz, nullable)
  - `status` (enum: proposed, accepted, declined, confirmed, in_progress, completed, cancelled)
  - `num_horses` (integer, default 1)
  - `sequence_order` (integer, for route optimization)
  - `total_price` (numeric, nullable)
  - `notes` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 7. `appointment_horses`
  Link table for horses in an appointment
  - `id` (uuid, PK)
  - `appointment_id` (uuid, FK to appointments)
  - `horse_id` (uuid, FK to horses)
  - `work_type` (enum: trim, two_shoes, four_shoes)
  - `weeks_since_last` (integer)
  - `special_notes` (text)
  - `created_at` (timestamptz)

  ### 8. `appointment_modifications`
  Add-ons applied to specific horses in an appointment
  - `id` (uuid, PK)
  - `appointment_id` (uuid, FK to appointments)
  - `horse_id` (uuid, FK to horses)
  - `add_on_id` (uuid, FK to add_ons)
  - `quantity` (integer, default 1)
  - `unit_price` (numeric)
  - `created_at` (timestamptz)

  ### 9. `payments`
  Payment tracking with Stripe integration
  - `id` (uuid, PK)
  - `appointment_id` (uuid, FK to appointments)
  - `payer_id` (uuid, FK to profiles)
  - `amount` (numeric)
  - `currency` (text, default 'EUR')
  - `platform_fee` (numeric)
  - `payment_method` (enum: pay_now, pay_later)
  - `due_date` (date, nullable)
  - `status` (enum: pending, paid, overdue, void)
  - `stripe_payment_intent_id` (text, nullable)
  - `stripe_transfer_id` (text, nullable)
  - `paid_at` (timestamptz, nullable)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 10. `invoices`
  Generated invoices with PDF links
  - `id` (uuid, PK)
  - `appointment_id` (uuid, FK to appointments)
  - `payment_id` (uuid, FK to payments)
  - `invoice_number` (text, unique)
  - `issued_date` (date)
  - `status` (enum: issued, paid, void)
  - `pdf_url` (text, nullable)
  - `language` (text)
  - `created_at` (timestamptz)

  ### 11. `notifications`
  In-app and push notifications
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to profiles)
  - `type` (enum: proposal, acceptance, payment_request, payment_due, follow_up, reminder)
  - `title` (text)
  - `body` (text)
  - `data` (jsonb)
  - `read` (boolean, default false)
  - `sent_at` (timestamptz)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Policies for each role (Farrier, Owner, Stable, Admin)
  - GDPR-compliant consent checks for stable access to horse data
  
  ## Important Notes
  1. All monetary values use numeric type for precision
  2. Enum types enforce valid status values
  3. Indexes on frequently queried columns (user_id, appointment dates, status)
  4. Foreign keys maintain referential integrity
  5. Timestamps track all changes for audit trails
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('farrier', 'owner', 'stable', 'admin');
CREATE TYPE work_type AS ENUM ('trim', 'two_shoes', 'four_shoes');
CREATE TYPE consent_status AS ENUM ('active', 'revoked');
CREATE TYPE customer_type AS ENUM ('owner', 'stable');
CREATE TYPE appointment_status AS ENUM ('proposed', 'accepted', 'declined', 'confirmed', 'in_progress', 'completed', 'cancelled');
CREATE TYPE payment_method_type AS ENUM ('pay_now', 'pay_later');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'overdue', 'void');
CREATE TYPE invoice_status AS ENUM ('issued', 'paid', 'void');
CREATE TYPE notification_type AS ENUM ('proposal', 'acceptance', 'payment_request', 'payment_due', 'follow_up', 'reminder');

-- 1. Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  address text,
  city text,
  country text DEFAULT 'IT',
  latitude numeric,
  longitude numeric,
  stripe_account_id text,
  stripe_customer_id text,
  language text DEFAULT 'en',
  tax_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Horses table
CREATE TABLE IF NOT EXISTS horses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stable_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  breed text,
  age integer,
  work_type work_type DEFAULT 'trim',
  special_notes text DEFAULT '',
  last_shoeing_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_horses_owner ON horses(owner_id);
CREATE INDEX idx_horses_stable ON horses(stable_id);

ALTER TABLE horses ENABLE ROW LEVEL SECURITY;

-- 3. Stable consents table
CREATE TABLE IF NOT EXISTS stable_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id uuid NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stable_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  granted_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  status consent_status DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  UNIQUE(horse_id, stable_id)
);

CREATE INDEX idx_consents_horse ON stable_consents(horse_id);
CREATE INDEX idx_consents_stable ON stable_consents(stable_id);
CREATE INDEX idx_consents_status ON stable_consents(status);

ALTER TABLE stable_consents ENABLE ROW LEVEL SECURITY;

-- 4. Price lists table
CREATE TABLE IF NOT EXISTS price_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farrier_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_type work_type NOT NULL,
  base_price numeric NOT NULL CHECK (base_price >= 0),
  currency text DEFAULT 'EUR',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(farrier_id, service_type)
);

CREATE INDEX idx_price_lists_farrier ON price_lists(farrier_id);

ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;

-- 5. Add-ons table
CREATE TABLE IF NOT EXISTS add_ons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farrier_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  currency text DEFAULT 'EUR',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_add_ons_farrier ON add_ons(farrier_id);

ALTER TABLE add_ons ENABLE ROW LEVEL SECURITY;

-- 6. Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farrier_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_type customer_type NOT NULL,
  proposed_date timestamptz NOT NULL,
  confirmed_date timestamptz,
  status appointment_status DEFAULT 'proposed',
  num_horses integer DEFAULT 1 CHECK (num_horses > 0),
  sequence_order integer,
  total_price numeric CHECK (total_price >= 0),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_appointments_farrier ON appointments(farrier_id);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_date ON appointments(proposed_date);
CREATE INDEX idx_appointments_status ON appointments(status);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 7. Appointment horses table
CREATE TABLE IF NOT EXISTS appointment_horses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  horse_id uuid NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  work_type work_type NOT NULL,
  weeks_since_last integer,
  special_notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_appointment_horses_appointment ON appointment_horses(appointment_id);
CREATE INDEX idx_appointment_horses_horse ON appointment_horses(horse_id);

ALTER TABLE appointment_horses ENABLE ROW LEVEL SECURITY;

-- 8. Appointment modifications table
CREATE TABLE IF NOT EXISTS appointment_modifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  horse_id uuid NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  add_on_id uuid NOT NULL REFERENCES add_ons(id) ON DELETE CASCADE,
  quantity integer DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_modifications_appointment ON appointment_modifications(appointment_id);

ALTER TABLE appointment_modifications ENABLE ROW LEVEL SECURITY;

-- 9. Payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  payer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text DEFAULT 'EUR',
  platform_fee numeric NOT NULL CHECK (platform_fee >= 0),
  payment_method payment_method_type NOT NULL,
  due_date date,
  status payment_status DEFAULT 'pending',
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_payments_appointment ON payments(appointment_id);
CREATE INDEX idx_payments_payer ON payments(payer_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_due_date ON payments(due_date);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 10. Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_number text UNIQUE NOT NULL,
  issued_date date DEFAULT CURRENT_DATE,
  status invoice_status DEFAULT 'issued',
  pdf_url text,
  language text DEFAULT 'en',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_invoices_appointment ON invoices(appointment_id);
CREATE INDEX idx_invoices_payment ON invoices(payment_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- 11. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  read boolean DEFAULT false,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_sent ON notifications(sent_at);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies

-- Profiles: Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Profiles: Farriers can view their customers
CREATE POLICY "Farriers can view their customers"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'farrier'
    )
    AND id IN (
      SELECT customer_id FROM appointments WHERE farrier_id = auth.uid()
    )
  );

-- Horses: Owners can manage their horses
CREATE POLICY "Owners can view own horses"
  ON horses FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert own horses"
  ON horses FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update own horses"
  ON horses FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete own horses"
  ON horses FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Horses: Stables can view/update horses with active consent
CREATE POLICY "Stables can view consented horses"
  ON horses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stable_consents sc
      JOIN profiles p ON p.id = auth.uid()
      WHERE sc.horse_id = horses.id
      AND sc.stable_id = auth.uid()
      AND sc.status = 'active'
      AND p.role = 'stable'
    )
  );

CREATE POLICY "Stables can update consented horses"
  ON horses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stable_consents sc
      JOIN profiles p ON p.id = auth.uid()
      WHERE sc.horse_id = horses.id
      AND sc.stable_id = auth.uid()
      AND sc.status = 'active'
      AND p.role = 'stable'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stable_consents sc
      WHERE sc.horse_id = horses.id
      AND sc.stable_id = auth.uid()
      AND sc.status = 'active'
    )
  );

-- Horses: Farriers can view horses in their appointments
CREATE POLICY "Farriers can view horses in appointments"
  ON horses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN appointment_horses ah ON ah.appointment_id = a.id
      JOIN profiles p ON p.id = auth.uid()
      WHERE ah.horse_id = horses.id
      AND a.farrier_id = auth.uid()
      AND p.role = 'farrier'
    )
  );

-- Stable consents: Owners can manage consents for their horses
CREATE POLICY "Owners can view consents for their horses"
  ON stable_consents FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can grant consent"
  ON stable_consents FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can revoke consent"
  ON stable_consents FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Stable consents: Stables can view their consents
CREATE POLICY "Stables can view their consents"
  ON stable_consents FOR SELECT
  TO authenticated
  USING (stable_id = auth.uid());

-- Price lists: Farriers manage their own price lists
CREATE POLICY "Farriers can manage own price lists"
  ON price_lists FOR ALL
  TO authenticated
  USING (farrier_id = auth.uid())
  WITH CHECK (farrier_id = auth.uid());

-- Add-ons: Farriers manage their own add-ons
CREATE POLICY "Farriers can manage own add-ons"
  ON add_ons FOR ALL
  TO authenticated
  USING (farrier_id = auth.uid())
  WITH CHECK (farrier_id = auth.uid());

-- Appointments: Farriers can manage their appointments
CREATE POLICY "Farriers can view own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (farrier_id = auth.uid());

CREATE POLICY "Farriers can create appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (farrier_id = auth.uid());

CREATE POLICY "Farriers can update own appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (farrier_id = auth.uid())
  WITH CHECK (farrier_id = auth.uid());

-- Appointments: Customers can view and respond to their appointments
CREATE POLICY "Customers can view their appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can update their appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Appointment horses: Readable by farrier and customer
CREATE POLICY "Farriers can manage appointment horses"
  ON appointment_horses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_horses.appointment_id
      AND a.farrier_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_horses.appointment_id
      AND a.farrier_id = auth.uid()
    )
  );

CREATE POLICY "Customers can view appointment horses"
  ON appointment_horses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_horses.appointment_id
      AND a.customer_id = auth.uid()
    )
  );

-- Appointment modifications: Farriers manage modifications
CREATE POLICY "Farriers can manage modifications"
  ON appointment_modifications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_modifications.appointment_id
      AND a.farrier_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_modifications.appointment_id
      AND a.farrier_id = auth.uid()
    )
  );

CREATE POLICY "Customers can view modifications"
  ON appointment_modifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_modifications.appointment_id
      AND a.customer_id = auth.uid()
    )
  );

-- Payments: Farriers and payers can view
CREATE POLICY "Farriers can view appointment payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = payments.appointment_id
      AND a.farrier_id = auth.uid()
    )
  );

CREATE POLICY "Payers can view their payments"
  ON payments FOR SELECT
  TO authenticated
  USING (payer_id = auth.uid());

CREATE POLICY "Farriers can create payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = payments.appointment_id
      AND a.farrier_id = auth.uid()
    )
  );

CREATE POLICY "System can update payment status"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    payer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = payments.appointment_id
      AND a.farrier_id = auth.uid()
    )
  )
  WITH CHECK (
    payer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = payments.appointment_id
      AND a.farrier_id = auth.uid()
    )
  );

-- Invoices: Farriers and payers can view
CREATE POLICY "Farriers can view invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = invoices.appointment_id
      AND a.farrier_id = auth.uid()
    )
  );

CREATE POLICY "Payers can view their invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN payments p ON p.appointment_id = a.id
      WHERE a.id = invoices.appointment_id
      AND p.payer_id = auth.uid()
    )
  );

CREATE POLICY "System can create invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = invoices.appointment_id
      AND (
        a.farrier_id = auth.uid() OR
        a.customer_id = auth.uid()
      )
    )
  );

-- Notifications: Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_horses_updated_at BEFORE UPDATE ON horses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_lists_updated_at BEFORE UPDATE ON price_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();