import { supabase } from '@/lib/supabase';

/**
 * UC-12: Farrier visualizza cavalli cliente
 *
 * Attore: Farrier
 * Descrizione: Il farrier visualizza tutti i cavalli di un cliente
 */

interface ListCustomerHorsesInput {
  farrierProfileId: string;
  customerProfileId: string;
  includeUnverified?: boolean;
}

interface Horse {
  id: string;
  name: string;
  breed?: string;
  birthYear?: number;
  gender?: string;
  color?: string;
  height?: number;
  discipline?: string;
  notes?: string;
  photos?: string[];
  source: string;
  verifiedByUser: boolean;
  createdAt: string;
}

interface ListCustomerHorsesResult {
  success: boolean;
  horses?: Horse[];
  error?: string;
}

export async function listCustomerHorses(
  input: ListCustomerHorsesInput
): Promise<ListCustomerHorsesResult> {
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

    // Query cavalli del cliente
    let query = supabase
      .from('horses')
      .select('*')
      .eq('owner_profile_id', input.customerProfileId)
      .order('created_at', { ascending: false });

    // Se non richiesto, escludere cavalli non verificati
    if (!input.includeUnverified) {
      query = query.eq('verified_by_user', true);
    }

    const { data: horsesData, error: horsesError } = await query;

    if (horsesError) {
      return {
        success: false,
        error: 'Errore durante il recupero dei cavalli',
      };
    }

    // Mappare i dati in formato camelCase
    const horses: Horse[] = (horsesData || []).map((horse) => ({
      id: horse.id,
      name: horse.name,
      breed: horse.breed,
      birthYear: horse.birth_year,
      gender: horse.gender,
      color: horse.color,
      height: horse.height,
      discipline: horse.discipline,
      notes: horse.notes,
      photos: horse.photos || [],
      source: horse.source,
      verifiedByUser: horse.verified_by_user,
      createdAt: horse.created_at,
    }));

    return {
      success: true,
      horses,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
