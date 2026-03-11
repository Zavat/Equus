/*
  # Fix Profile Trigger Schema

  ## Summary
  Updates the automatic profile creation trigger to match the actual database schema.
  The trigger was using incorrect column names (email, full_name) that don't exist in the profiles table.

  ## Changes
  - Update handle_new_user() function to use correct schema:
    - Remove email (not in profiles table, stored in auth.users)
    - Remove full_name (not in profiles table, stored in people table)
    - Keep only columns that exist: user_id, role, country, language, source
  
  ## Notes
  - The trigger creates a minimal profile record
  - Person details should be created separately by application code
  - Default role is 'customer' for new signups
*/

-- Drop and recreate the trigger function with correct schema
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create function to handle new user signup with correct schema
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert a new profile for the user with correct columns
  INSERT INTO public.profiles (
    user_id,
    role,
    country,
    language,
    source
  ) VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::profile_role, 'customer'),
    COALESCE(NEW.raw_user_meta_data->>'country', 'IT'),
    COALESCE(NEW.raw_user_meta_data->>'language', 'en'),
    'user'
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
