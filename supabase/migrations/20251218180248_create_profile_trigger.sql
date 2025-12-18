/*
  # Add Automatic Profile Creation Trigger

  ## Summary
  Creates a database trigger that automatically creates a profile when a new user signs up.
  This ensures profiles are created with proper permissions and eliminates RLS policy issues.

  ## Changes
  1. New Function
    - `handle_new_user()` - Trigger function that creates a profile for new auth users
    - Automatically extracts metadata from auth.users
    - Sets default role to 'owner' if not specified
    - Runs with SECURITY DEFINER to bypass RLS

  2. New Trigger
    - `on_auth_user_created` - Fires after INSERT on auth.users
    - Calls handle_new_user() function
    - Ensures profile is created before any app code runs

  ## Security Notes
  - Function runs with SECURITY DEFINER (elevated privileges)
  - Only creates profiles, doesn't modify existing ones
  - Default role is 'owner' for safety
  - Email is automatically copied from auth.users
*/

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert a new profile for the user
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    country,
    language
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'owner'),
    COALESCE(NEW.raw_user_meta_data->>'country', 'IT'),
    COALESCE(NEW.raw_user_meta_data->>'language', 'en')
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
