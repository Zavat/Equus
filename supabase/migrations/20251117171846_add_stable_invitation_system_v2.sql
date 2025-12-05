/*
  # Add Stable Invitation System

  ## Overview
  Allows Stables to send invitations to Owners to manage their horses.
  Owners must explicitly accept invitations before Stable gains access.

  ## New Table
  
  ### stable_invitations
  - `id` (uuid, PK)
  - `stable_id` (uuid, FK to profiles) - The stable sending the invitation
  - `owner_id` (uuid, FK to profiles) - The owner being invited
  - `horse_id` (uuid, nullable FK to horses) - Specific horse (or null for all)
  - `status` (enum: pending, accepted, declined, expired)
  - `message` (text) - Optional message from stable
  - `expires_at` (timestamptz) - When invitation expires
  - `responded_at` (timestamptz, nullable) - When owner responded
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
*/

-- Create invitation status enum
DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create stable_invitations table
CREATE TABLE IF NOT EXISTS stable_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  horse_id uuid REFERENCES horses(id) ON DELETE CASCADE,
  status invitation_status DEFAULT 'pending' NOT NULL,
  message text,
  expires_at timestamptz DEFAULT (now() + interval '7 days') NOT NULL,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stable_invitations_stable_id ON stable_invitations(stable_id);
CREATE INDEX IF NOT EXISTS idx_stable_invitations_owner_id ON stable_invitations(owner_id);
CREATE INDEX IF NOT EXISTS idx_stable_invitations_status ON stable_invitations(status);
CREATE INDEX IF NOT EXISTS idx_stable_invitations_horse_id ON stable_invitations(horse_id);

-- Enable RLS
ALTER TABLE stable_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Stables can view their own invitations
CREATE POLICY "Stables can view own invitations"
ON stable_invitations FOR SELECT
TO authenticated
USING (stable_id = auth.uid());

-- Stables can create invitations
CREATE POLICY "Stables can create invitations"
ON stable_invitations FOR INSERT
TO authenticated
WITH CHECK (
  stable_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'stable'
  )
);

-- Owners can view invitations sent to them
CREATE POLICY "Owners can view invitations sent to them"
ON stable_invitations FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Owners can update invitations sent to them (accept/decline)
CREATE POLICY "Owners can respond to invitations"
ON stable_invitations FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  AND status = 'pending'
)
WITH CHECK (
  owner_id = auth.uid()
  AND status IN ('accepted', 'declined')
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_stable_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_stable_invitations_updated_at'
  ) THEN
    CREATE TRIGGER update_stable_invitations_updated_at
    BEFORE UPDATE ON stable_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_stable_invitations_updated_at();
  END IF;
END $$;

-- Function to automatically create consent when invitation is accepted
CREATE OR REPLACE FUNCTION handle_invitation_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when status changes to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    NEW.responded_at = now();
    
    -- If invitation is for a specific horse, create consent for that horse
    IF NEW.horse_id IS NOT NULL THEN
      INSERT INTO stable_consents (horse_id, owner_id, stable_id, status)
      VALUES (NEW.horse_id, NEW.owner_id, NEW.stable_id, 'active')
      ON CONFLICT DO NOTHING;
    
    -- If invitation is for all horses (horse_id is null), create consents for all owner's horses
    ELSE
      INSERT INTO stable_consents (horse_id, owner_id, stable_id, status)
      SELECT id, NEW.owner_id, NEW.stable_id, 'active'
      FROM horses
      WHERE owner_id = NEW.owner_id
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  -- Handle declined invitations
  IF NEW.status = 'declined' AND OLD.status = 'pending' THEN
    NEW.responded_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'handle_invitation_acceptance_trigger'
  ) THEN
    CREATE TRIGGER handle_invitation_acceptance_trigger
    BEFORE UPDATE ON stable_invitations
    FOR EACH ROW
    EXECUTE FUNCTION handle_invitation_acceptance();
  END IF;
END $$;