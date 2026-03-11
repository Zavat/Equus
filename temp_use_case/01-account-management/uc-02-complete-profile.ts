import { supabase } from '@/lib/supabase';

/**
 * UC-02: Completare profilo utente
 *
 * Attore: Cliente
 * Descrizione: L'utente completa le informazioni del proprio profilo dopo la registrazione
 *
 * OTTIMIZZATO: Usa una singola chiamata RPC invece di 3 query separate
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
    // Use database function for single-query update (atomic transaction)
    const { data, error } = await supabase.rpc('complete_profile', {
      p_user_id: input.userId,
      p_language: input.preferredLanguage || null,
      p_preferred_maps_app: input.preferredMapsApp || null,
      p_address: input.address || null,
      p_city: input.city || null,
      p_country: input.country || null,
      p_phone: input.phone || null,
    });

    if (error) {
      console.error('Profile update error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Parse response from function
    const result = data as { success: boolean; error?: string };

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Profile update failed',
      };
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
