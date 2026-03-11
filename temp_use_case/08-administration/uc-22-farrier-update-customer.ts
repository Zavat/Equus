import { supabase } from '@/lib/supabase';

/**
 * UC-22: Farrier aggiorna cliente
 *
 * Attore: Farrier
 * Descrizione: Il farrier aggiorna le informazioni di un cliente creato da lui
 */

interface FarrierUpdateCustomerInput {
  farrierProfileId: string;
  customerProfileId: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  notes?: string;
}

interface FarrierUpdateCustomerResult {
  success: boolean;
  error?: string;
}

export async function farrierUpdateCustomer(
  input: FarrierUpdateCustomerInput
): Promise<FarrierUpdateCustomerResult> {
  try {
    // Verificare che esista la relazione farrier-cliente
    const { data: relationData, error: relationError } = await supabase
      .from('farrier_customer_relations')
      .select('id')
      .eq('farrier_profile_id', input.farrierProfileId)
      .eq('customer_profile_id', input.customerProfileId)
      .maybeSingle();

    if (relationError || !relationData) {
      return {
        success: false,
        error: 'Relazione farrier-cliente non trovata',
      };
    }

    // Verificare che il profilo cliente sia stato creato dal farrier
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('source')
      .eq('id', input.customerProfileId)
      .single();

    if (profileError || !profileData) {
      return {
        success: false,
        error: 'Profilo cliente non trovato',
      };
    }

    if (profileData.source !== 'farrier') {
      return {
        success: false,
        error: 'Non sei autorizzato a modificare questo profilo cliente',
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
    if (input.notes !== undefined) updateData.notes = input.notes;

    // Aggiornare il profilo
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', input.customerProfileId);

    if (updateError) {
      return {
        success: false,
        error: 'Errore durante l\'aggiornamento del profilo cliente',
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
