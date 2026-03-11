/*
  # Create complete_profile database function

  1. New Functions
    - `complete_profile` - Aggiorna profile e people in una singola transazione
      - Parametri: user_id, language, preferred_maps_app, address, city, country, phone
      - Ritorna: success boolean
  
  2. Benefits
    - Singola chiamata al database invece di 3
    - Transazione atomica
    - Riduce problemi di connessione
    - Più performante

  3. Security
    - Function runs with SECURITY DEFINER per bypassare RLS
    - Controllo manuale che l'utente possa modificare solo i propri dati
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS complete_profile(uuid, text, text, text, text, text, text);

-- Create function to complete profile in a single transaction
CREATE OR REPLACE FUNCTION complete_profile(
  p_user_id uuid,
  p_language text DEFAULT NULL,
  p_preferred_maps_app text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person_id uuid;
  v_profile_id uuid;
BEGIN
  -- Verify user can only update their own profile
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get profile and person_id
  SELECT id, person_id INTO v_profile_id, v_person_id
  FROM profiles
  WHERE user_id = p_user_id;

  IF v_profile_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Update profile
  UPDATE profiles
  SET 
    language = COALESCE(p_language, language),
    preferred_maps_app = COALESCE(p_preferred_maps_app, preferred_maps_app),
    address = COALESCE(p_address, address),
    city = COALESCE(p_city, city),
    country = COALESCE(p_country, country),
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Update people if person_id exists and phone is provided
  IF v_person_id IS NOT NULL AND p_phone IS NOT NULL THEN
    UPDATE people
    SET 
      phone = p_phone,
      updated_at = now()
    WHERE id = v_person_id;
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION complete_profile(uuid, text, text, text, text, text, text) TO authenticated;

COMMENT ON FUNCTION complete_profile IS 'Complete user profile with all data in a single transaction';
