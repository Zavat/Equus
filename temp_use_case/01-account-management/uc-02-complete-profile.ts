import { supabase } from '@/lib/supabase';

// Simple retry helper for network errors
async function retryOnNetworkError<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const errorMessage = lastError.message.toLowerCase();
      const isNetworkError = errorMessage.includes('fetch failed') ||
                            errorMessage.includes('socket') ||
                            errorMessage.includes('connection');

      if (!isNetworkError || attempt === maxRetries) {
        throw lastError;
      }

      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  throw lastError!;
}

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
    // Step 1: Get profile to find person_id (with retry)
    const profile = await retryOnNetworkError(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, person_id')
        .eq('user_id', input.userId)
        .single();

      if (error) throw new Error(error.message);
      if (!data) throw new Error('Profile not found');
      return data;
    });

    // Step 2: Update profile with profile-specific fields (with retry)
    await retryOnNetworkError(async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          language: input.preferredLanguage,
          preferred_maps_app: input.preferredMapsApp,
          address: input.address,
          city: input.city,
          country: input.country,
        })
        .eq('user_id', input.userId);

      if (error) throw new Error(error.message);
    });

    // Step 3: Update people with phone if provided and person_id exists (with retry)
    if (input.phone && profile.person_id) {
      try {
        await retryOnNetworkError(async () => {
          const { error } = await supabase
            .from('people')
            .update({ phone: input.phone })
            .eq('id', profile.person_id!);

          if (error) throw new Error(error.message);
        });
      } catch (peopleError) {
        console.error('People update error:', peopleError);
        // Non bloccare se l'aggiornamento di phone fallisce
      }
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Complete profile error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
