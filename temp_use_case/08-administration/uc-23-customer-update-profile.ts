import { supabase } from '@/lib/supabase';

/**
 * UC-23: Cliente aggiorna i propri dati
 *
 * Attore: Cliente
 * Descrizione: Il cliente aggiorna autonomamente i propri dati
 */

interface CustomerUpdateProfileInput {
  customerProfileId: string;
  userId: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  preferredLanguage?: string;
  preferredMapsApp?: string;
  useDeviceLanguage?: boolean;
}

interface CustomerUpdateProfileResult {
  success: boolean;
  error?: string;
}

export async function customerUpdateProfile(
  input: CustomerUpdateProfileInput
): Promise<CustomerUpdateProfileResult> {
  try {
    // Verificare che il profilo appartenga all'utente
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', input.customerProfileId)
      .single();

    if (profileError || !profileData) {
      return {
        success: false,
        error: 'Profilo non trovato',
      };
    }

    if (profileData.user_id !== input.userId) {
      return {
        success: false,
        error: 'Non sei autorizzato a modificare questo profilo',
      };
    }

    // Preparare i dati da aggiornare
    const updateData: Record<string, any> = {};
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.city !== undefined) updateData.city = input.city;
    if (input.country !== undefined) updateData.country = input.country;
    if (input.postalCode !== undefined) updateData.postal_code = input.postalCode;
    if (input.preferredLanguage !== undefined)
      updateData.preferred_language = input.preferredLanguage;
    if (input.preferredMapsApp !== undefined)
      updateData.preferred_maps_app = input.preferredMapsApp;
    if (input.useDeviceLanguage !== undefined)
      updateData.use_device_language = input.useDeviceLanguage;

    // Aggiornare il profilo
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', input.customerProfileId);

    if (updateError) {
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
