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

export async function completeProfile(
  input: CompleteProfileInput
): Promise<CompleteProfileResult> {
  try {
    // Aggiornare il profilo con i dati forniti
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        phone: input.phone,
        preferred_language: input.preferredLanguage,
        preferred_maps_app: input.preferredMapsApp,
        address: input.address,
        city: input.city,
        country: input.country,
        postal_code: input.postalCode,
      })
      .eq('user_id', input.userId);

    if (profileError) {
      return {
        success: false,
        error: 'Errore durante l\'aggiornamento del profilo',
      };
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
