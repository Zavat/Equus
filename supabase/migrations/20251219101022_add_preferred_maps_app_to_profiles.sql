/*
  # Add preferred maps app to profiles

  1. Changes
    - Add `preferred_maps_app` column to `profiles` table
      - Type: text (either 'google' or 'apple')
      - Nullable: yes (null means no preference set yet)
      - Default: null
  
  2. Purpose
    - Store user's preference for which maps application to use
    - Allows the app to remember the choice after first selection
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferred_maps_app'
  ) THEN
    ALTER TABLE profiles ADD COLUMN preferred_maps_app text;
  END IF;
END $$;