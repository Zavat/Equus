import { supabase } from '@/lib/supabase';

/**
 * UC-09: Cliente aggiunge cavallo
 *
 * Attore: Cliente
 * Descrizione: Il cliente aggiunge autonomamente un cavallo al proprio profilo
 */

interface CustomerAddHorseInput {
  customerProfileId: string;
  name: string;
  breed?: string;
  birthYear?: number;
  gender?: 'stallion' | 'mare' | 'gelding';
  color?: string;
  height?: number;
  discipline?: string;
  notes?: string;
  photos?: string[];
}

interface CustomerAddHorseResult {
  success: boolean;
  horseId?: string;
  error?: string;
}

export async function customerAddHorse(
  input: CustomerAddHorseInput
): Promise<CustomerAddHorseResult> {
  try {
    // Creare il cavallo con source='user' e verified_by_user=true
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
        photos: input.photos || [],
        source: 'user',
        verified_by_user: true,
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
