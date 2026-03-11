/*
  # Update Trigger to Create People Record

  ## Summary
  Updates the handle_new_user trigger to also create a people record
  and link it to the profile automatically during user signup.

  ## Changes
  - Modify handle_new_user() to create people record from user metadata
  - Link people to profile automatically
  - Extract first_name and last_name from metadata

  ## Security Notes
  - Function runs with SECURITY DEFINER (bypasses RLS)
  - Creates both people and profile records atomically
*/

-- Drop and recreate the trigger function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create enhanced function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_person_id uuid;
BEGIN
  -- First, create a people record if first_name and last_name are provided
  IF NEW.raw_user_meta_data->>'first_name' IS NOT NULL 
     AND NEW.raw_user_meta_data->>'last_name' IS NOT NULL THEN
    
    INSERT INTO public.people (
      first_name,
      last_name,
      email,
      phone
    ) VALUES (
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      NEW.email,
      NEW.raw_user_meta_data->>'phone'
    ) RETURNING id INTO new_person_id;
  END IF;

  -- Then, create the profile and link to people if created
  INSERT INTO public.profiles (
    user_id,
    person_id,
    role,
    country,
    language,
    source
  ) VALUES (
    NEW.id,
    new_person_id,
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
