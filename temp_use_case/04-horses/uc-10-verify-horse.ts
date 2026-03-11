import { supabase } from '@/lib/supabase';

/**
 * UC-10: Cliente conferma cavallo
 *
 * Attore: Cliente
 * Descrizione: Il cliente conferma un cavallo aggiunto dal farrier
 */

interface VerifyHorseInput {
  horseId: string;
  customerProfileId: string;
}

interface VerifyHorseResult {
  success: boolean;
  error?: string;
}

export async function verifyHorse(
  input: VerifyHorseInput
): Promise<VerifyHorseResult> {
  try {
    // Verificare che il cavallo appartenga al cliente e non sia già verificato
    const { data: horseData, error: horseError } = await supabase
      .from('horses')
      .select('id, owner_profile_id, verified_by_user')
      .eq('id', input.horseId)
      .single();

    if (horseError || !horseData) {
      return {
        success: false,
        error: 'Cavallo non trovato',
      };
    }

    if (horseData.owner_profile_id !== input.customerProfileId) {
      return {
        success: false,
        error: 'Non sei autorizzato a verificare questo cavallo',
      };
    }

    if (horseData.verified_by_user) {
      return {
        success: true,
      };
    }

    // Aggiornare verified_by_user a true
    const { error: updateError } = await supabase
      .from('horses')
      .update({ verified_by_user: true })
      .eq('id', input.horseId);

    if (updateError) {
      return {
        success: false,
        error: 'Errore durante la verifica del cavallo',
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
