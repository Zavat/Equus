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
  birthYear?: number;
  gender?: 'stallion' | 'mare' | 'gelding';
  color?: string;
  height?: number;
  discipline?: string;
  notes?: string;
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

    // Creare il cavallo con source='farrier' e verified_by_user=false
    const { data: horseData, error: horseError } = await supabase
      .from('horses')
      .insert({
        owner_profile_id: input.customerProfileId,
        name: input.name,
        breed: input.breed,
        birth_year: input.birthYear,
        gender: input.gender,
        color: input.color,
        height: input.height,
        discipline: input.discipline,
        notes: input.notes,
        source: 'farrier',
        verified_by_user: false,
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
