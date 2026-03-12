import { supabase } from '@/lib/supabase';

/**
 * UC-08: Farrier aggiunge cavallo
 *
 * Attore: Farrier
 * Descrizione: Il farrier aggiunge un cavallo al profilo di un cliente
 */

interface FarrierAddHorseInput {
  farrierProfileId: string;
  customerProfileId: string;
  name: string;
  breed?: string;
  age?: number;
  dateOfBirth?: string;
  sex?: 'male' | 'female' | 'gelding';
  isShod?: boolean;
  workType?: 'trim' | 'two_shoes' | 'four_shoes';
  lastShoeingDate?: string;
  issues?: string;
  pathologies?: string;
  specialNotes?: string;
  primaryPhotoUrl?: string;
}

interface FarrierAddHorseResult {
  success: boolean;
  horseId?: string;
  error?: string;
}

export async function farrierAddHorse(
  input: FarrierAddHorseInput
): Promise<FarrierAddHorseResult> {
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

    // Creare il cavallo - il maniscalco lo aggiunge per il cliente
    const { data: horseData, error: horseError } = await supabase
      .from('horses')
      .insert({
        owner_id: input.customerProfileId,
        stable_id: null,
        name: input.name,
        breed: input.breed || null,
        age: input.age || null,
        work_type: input.workType || 'trim',
        special_notes: input.specialNotes || '',
        last_shoeing_date: input.lastShoeingDate || null,
        date_of_birth: input.dateOfBirth || null,
        sex: input.sex || null,
        is_shod: input.isShod !== undefined ? input.isShod : true,
        issues: input.issues || null,
        pathologies: input.pathologies || null,
        primary_photo_url: input.primaryPhotoUrl || null,
      })
      .select('id')
      .single();

    if (horseError || !horseData) {
      return {
        success: false,
        error: 'Errore durante la creazione del cavallo',
      };
    }

    return {
      success: true,
      horseId: horseData.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
