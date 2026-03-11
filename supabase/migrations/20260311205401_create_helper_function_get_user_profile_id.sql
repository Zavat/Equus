/*
  # Create helper function to avoid RLS recursion

  1. New Functions
    - `get_user_profile_id()` - Returns the profile ID for the current authenticated user
      - Uses SECURITY DEFINER to bypass RLS
      - Returns NULL if no profile found
  
  2. Benefits
    - Prevents infinite recursion in RLS policies
    - Can be used safely in policy conditions
    - Optimized with single query
*/

-- Create function to get current user's profile ID
CREATE OR REPLACE FUNCTION get_user_profile_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

COMMENT ON FUNCTION get_user_profile_id IS 'Returns profile ID for current user, bypassing RLS to avoid recursion';
