import { supabase } from '@/lib/supabase';

/**
 * UC-02: Completare profilo utente
 *
 * Attore: Cliente
 * Descrizione: L'utente completa le informazioni del proprio profilo dopo la registrazione
 */

interface CompleteProfileInput {
  userId: string;
  phone?: string;
  preferredLanguage?: string;
  preferredMapsApp?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
}

interface CompleteProfileResult {
  success: boolean;
  error?: string;
}

// Overload signatures for backward compatibility
export async function completeProfile(
  userId: string,
  profileData: Omit<CompleteProfileInput, 'userId'>
): Promise<CompleteProfileResult>;
export async function completeProfile(
  input: CompleteProfileInput
): Promise<CompleteProfileResult>;

// Implementation
export async function completeProfile(
  userIdOrInput: string | CompleteProfileInput,
  profileData?: Omit<CompleteProfileInput, 'userId'>
): Promise<CompleteProfileResult> {
  // Handle both call signatures
  const input: CompleteProfileInput = typeof userIdOrInput === 'string'
    ? { userId: userIdOrInput, ...profileData! }
    : userIdOrInput;

  try {
    // Step 1: Get profile to find person_id
    const { data: profile, error: profileFetchError } = await supabase
      .from('profiles')
      .select('id, person_id')
      .eq('user_id', input.userId)
      .single();

    if (profileFetchError || !profile) {
      console.error('Profile fetch error:', profileFetchError);
      return {
        success: false,
        error: `Errore durante il recupero del profilo: ${profileFetchError?.message}`,
      };
    }

    // Step 2: Update profile with profile-specific fields
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        language: input.preferredLanguage,
        preferred_maps_app: input.preferredMapsApp,
        address: input.address,
        city: input.city,
        country: input.country,
      })
      .eq('user_id', input.userId);

    if (profileError) {
      console.error('Profile update error:', profileError);
      return {
        success: false,
        error: `Errore durante l'aggiornamento del profilo: ${profileError.message}`,
      };
    }

    // Step 3: Update people with phone if provided and person_id exists
    if (input.phone && profile.person_id) {
      const { error: peopleError } = await supabase
        .from('people')
        .update({ phone: input.phone })
        .eq('id', profile.person_id);

      if (peopleError) {
        console.error('People update error:', peopleError);
        // Non bloccare se l'aggiornamento di phone fallisce
      }
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
