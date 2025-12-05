/*
  # Enhance Horses Table with Photos and Technical Sheet Fields

  ## Changes
  1. Add new fields to horses table:
     - date_of_birth (date) - Horse's birth date
     - sex (text) - Male, Female, Gelding
     - is_shod (boolean) - Whether horse wears shoes or is barefoot
     - issues (text) - Health or behavioral issues
     - pathologies (text) - Medical conditions
     - primary_photo_url (text) - Main horse photo
  
  2. Create horse_photos table for multiple photos per horse
     - Allows storing multiple photos with captions
     - Links to Supabase Storage
  
  3. Add RLS policies for horse photos
*/

-- Add new fields to horses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'horses' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE horses ADD COLUMN date_of_birth date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'horses' AND column_name = 'sex'
  ) THEN
    ALTER TABLE horses ADD COLUMN sex text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'horses' AND column_name = 'is_shod'
  ) THEN
    ALTER TABLE horses ADD COLUMN is_shod boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'horses' AND column_name = 'issues'
  ) THEN
    ALTER TABLE horses ADD COLUMN issues text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'horses' AND column_name = 'pathologies'
  ) THEN
    ALTER TABLE horses ADD COLUMN pathologies text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'horses' AND column_name = 'primary_photo_url'
  ) THEN
    ALTER TABLE horses ADD COLUMN primary_photo_url text;
  END IF;
END $$;

-- Create horse_photos table for multiple photos
CREATE TABLE IF NOT EXISTS horse_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id uuid REFERENCES horses(id) ON DELETE CASCADE NOT NULL,
  photo_url text NOT NULL,
  caption text,
  is_primary boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_horse_photos_horse_id ON horse_photos(horse_id);
CREATE INDEX IF NOT EXISTS idx_horse_photos_is_primary ON horse_photos(horse_id, is_primary);

-- Enable RLS on horse_photos
ALTER TABLE horse_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for horse_photos

-- Owners can view photos of their own horses
CREATE POLICY "Owners can view own horse photos"
ON horse_photos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM horses
    WHERE horses.id = horse_photos.horse_id
    AND horses.owner_id = auth.uid()
  )
);

-- Owners can insert photos for their own horses
CREATE POLICY "Owners can insert own horse photos"
ON horse_photos FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM horses
    WHERE horses.id = horse_photos.horse_id
    AND horses.owner_id = auth.uid()
  )
);

-- Owners can update photos of their own horses
CREATE POLICY "Owners can update own horse photos"
ON horse_photos FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM horses
    WHERE horses.id = horse_photos.horse_id
    AND horses.owner_id = auth.uid()
  )
);

-- Owners can delete photos of their own horses
CREATE POLICY "Owners can delete own horse photos"
ON horse_photos FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM horses
    WHERE horses.id = horse_photos.horse_id
    AND horses.owner_id = auth.uid()
  )
);

-- Stables can view photos of horses they have consent for
CREATE POLICY "Stables can view consented horse photos"
ON horse_photos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stable_consents
    WHERE stable_consents.horse_id = (
      SELECT id FROM horses WHERE horses.id = horse_photos.horse_id
    )
    AND stable_consents.stable_id = auth.uid()
    AND stable_consents.status = 'active'
  )
);

-- Farriers can view horse photos for their appointments
CREATE POLICY "Farriers can view horse photos for appointments"
ON horse_photos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM appointment_horses ah
    JOIN appointments a ON a.id = ah.appointment_id
    WHERE ah.horse_id = (
      SELECT id FROM horses WHERE horses.id = horse_photos.horse_id
    )
    AND a.farrier_id = auth.uid()
  )
);

-- Add updated_at trigger for horse_photos
CREATE OR REPLACE FUNCTION update_horse_photos_updated_at()
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
    WHERE tgname = 'update_horse_photos_updated_at'
  ) THEN
    CREATE TRIGGER update_horse_photos_updated_at
    BEFORE UPDATE ON horse_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_horse_photos_updated_at();
  END IF;
END $$;