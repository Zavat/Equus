import { supabase } from '@/lib/supabase';

/**
 * UC-21: Cliente rifiuta cavallo
 *
 * Attore: Cliente
 * Descrizione: Il cliente rifiuta un cavallo aggiunto dal farrier
 */

interface RejectHorseInput {
  horseId: string;
  customerProfileId: string;
  deleteRecord?: boolean;
}

interface RejectHorseResult {
  success: boolean;
  deleted?: boolean;
  error?: string;
}

export async function rejectHorse(
  input: RejectHorseInput
): Promise<RejectHorseResult> {
  try {
    // Verificare che il cavallo appartenga al cliente e sia temporaneo
    const { data: horseData, error: horseError } = await supabase
      .from('horses')
      .select('id, owner_profile_id, source, verified_by_user')
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
        error: 'Non sei autorizzato a rifiutare questo cavallo',
      };
    }

    if (horseData.source !== 'farrier' || horseData.verified_by_user) {
      return {
        success: false,
        error: 'Questo cavallo non può essere rifiutato',
      };
    }

    // Opzione 1: Eliminare il record (default)
    if (input.deleteRecord !== false) {
      const { error: deleteError } = await supabase
        .from('horses')
        .delete()
        .eq('id', input.horseId);

      if (deleteError) {
        return {
          success: false,
          error: 'Errore durante l\'eliminazione del cavallo',
        };
      }

      return {
        success: true,
        deleted: true,
      };
    }

    // Opzione 2: Impostare status='rejected' (se colonna esiste)
    // Nota: La tabella attuale non ha questo campo, ma potrebbe essere aggiunto
    const { error: updateError } = await supabase
      .from('horses')
      .update({
        // status: 'rejected' // Da aggiungere alla tabella se necessario
      })
      .eq('id', input.horseId);

    if (updateError) {
      return {
        success: false,
        error: 'Errore durante il rifiuto del cavallo',
      };
    }

    return {
      success: true,
      deleted: false,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
