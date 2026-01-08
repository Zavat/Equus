/*
  # Add use_device_language to profiles

  1. Changes
    - Add `use_device_language` boolean column to profiles table
    - Default value is true (app follows device locale by default)
  
  2. Purpose
    - When true: app automatically uses device language on each launch
    - When false: app uses user's manually selected language preference
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'use_device_language'
  ) THEN
    ALTER TABLE profiles ADD COLUMN use_device_language boolean DEFAULT true;
  END IF;
END $$;
