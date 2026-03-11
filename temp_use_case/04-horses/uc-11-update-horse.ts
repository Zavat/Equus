import { supabase } from '@/lib/supabase';

/**
 * UC-11: Cliente modifica cavallo
 *
 * Attore: Cliente
 * Descrizione: Il cliente modifica le informazioni di un cavallo
 */

interface UpdateHorseInput {
  horseId: string;
  customerProfileId: string;
  name?: string;
  breed?: string;
  birthYear?: number;
  gender?: 'stallion' | 'mare' | 'gelding';
  color?: string;
  height?: number;
  discipline?: string;
  notes?: string;
  photos?: string[];
}

interface UpdateHorseResult {
  success: boolean;
  error?: string;
}

export async function updateHorse(
  input: UpdateHorseInput
): Promise<UpdateHorseResult> {
  try {
    // Verificare che il cavallo appartenga al cliente
    const { data: horseData, error: horseError } = await supabase
      .from('horses')
      .select('owner_profile_id')
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
        error: 'Non sei autorizzato a modificare questo cavallo',
      };
    }

    // Preparare i dati da aggiornare (solo i campi forniti)
    const updateData: Record<string, any> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.breed !== undefined) updateData.breed = input.breed;
    if (input.birthYear !== undefined) updateData.birth_year = input.birthYear;
    if (input.gender !== undefined) updateData.gender = input.gender;
    if (input.color !== undefined) updateData.color = input.color;
    if (input.height !== undefined) updateData.height = input.height;
    if (input.discipline !== undefined) updateData.discipline = input.discipline;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.photos !== undefined) updateData.photos = input.photos;

    // Aggiornare il cavallo
    const { error: updateError } = await supabase
      .from('horses')
      .update(updateData)
      .eq('id', input.horseId);

    if (updateError) {
      return {
        success: false,
        error: 'Errore durante l\'aggiornamento del cavallo',
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
