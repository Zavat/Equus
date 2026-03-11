import { supabase } from '@/lib/supabase';

/**
 * UC-04: Collegare cliente al farrier
 *
 * Attore: Farrier
 * Descrizione: Stabilisce la relazione tra farrier e cliente
 */

interface LinkCustomerToFarrierInput {
  farrierProfileId: string;
  customerProfileId: string;
}

interface LinkCustomerToFarrierResult {
  success: boolean;
  relationId?: string;
  error?: string;
}

export async function linkCustomerToFarrier(
  input: LinkCustomerToFarrierInput
): Promise<LinkCustomerToFarrierResult> {
  try {
    // Verificare che non esista già la relazione
    const { data: existingRelation } = await supabase
      .from('farrier_customer_relations')
      .select('id')
      .eq('farrier_profile_id', input.farrierProfileId)
      .eq('customer_profile_id', input.customerProfileId)
      .maybeSingle();

    if (existingRelation) {
      return {
        success: true,
        relationId: existingRelation.id,
      };
    }

    // Creare la relazione
    const { data: relationData, error: relationError } = await supabase
      .from('farrier_customer_relations')
      .insert({
        farrier_profile_id: input.farrierProfileId,
        customer_profile_id: input.customerProfileId,
      })
      .select('id')
      .single();

    if (relationError || !relationData) {
      return {
        success: false,
        error: 'Errore durante la creazione della relazione farrier-cliente',
      };
    }

    return {
      success: true,
      relationId: relationData.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
