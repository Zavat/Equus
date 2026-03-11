import { supabase } from '@/lib/supabase';

/**
 * UC-20: Mostrare dati temporanei all'utente
 *
 * Attore: Sistema
 * Descrizione: Mostra al cliente i dati aggiunti dal farrier in attesa di conferma
 */

interface ShowTemporaryDataInput {
  customerProfileId: string;
}

interface TemporaryHorse {
  id: string;
  name: string;
  breed?: string;
  birthYear?: number;
  gender?: string;
  color?: string;
  height?: number;
  discipline?: string;
  notes?: string;
  createdAt: string;
  addedByFarrier: boolean;
}

interface ShowTemporaryDataResult {
  success: boolean;
  temporaryHorses?: TemporaryHorse[];
  count?: number;
  error?: string;
}

export async function showTemporaryData(
  input: ShowTemporaryDataInput
): Promise<ShowTemporaryDataResult> {
  try {
    // Query cavalli temporanei (source='farrier' e verified_by_user=false)
    const { data: horsesData, error: horsesError } = await supabase
      .from('horses')
      .select('*')
      .eq('owner_profile_id', input.customerProfileId)
      .eq('source', 'farrier')
      .eq('verified_by_user', false)
      .order('created_at', { ascending: false });

    if (horsesError) {
      return {
        success: false,
        error: 'Errore durante il recupero dei dati temporanei',
      };
    }

    // Mappare i dati
    const temporaryHorses: TemporaryHorse[] = (horsesData || []).map((horse) => ({
      id: horse.id,
      name: horse.name,
      breed: horse.breed,
      birthYear: horse.birth_year,
      gender: horse.gender,
      color: horse.color,
      height: horse.height,
      discipline: horse.discipline,
      notes: horse.notes,
      createdAt: horse.created_at,
      addedByFarrier: true,
    }));

    return {
      success: true,
      temporaryHorses,
      count: temporaryHorses.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
