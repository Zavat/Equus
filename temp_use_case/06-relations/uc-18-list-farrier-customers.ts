import { supabase } from '@/lib/supabase';

/**
 * UC-18: Farrier vede lista clienti
 *
 * Attore: Farrier
 * Descrizione: Il farrier visualizza tutti i propri clienti
 */

interface ListFarrierCustomersInput {
  farrierProfileId: string;
  searchTerm?: string;
}

interface Customer {
  profileId: string;
  personId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  notes?: string;
  hasAccount: boolean;
  relationCreatedAt: string;
}

interface ListFarrierCustomersResult {
  success: boolean;
  customers?: Customer[];
  error?: string;
}

export async function listFarrierCustomers(
  input: ListFarrierCustomersInput
): Promise<ListFarrierCustomersResult> {
  try {
    // Query relazioni con join su profiles e people
    let query = supabase
      .from('farrier_customer_relations')
      .select(`
        created_at,
        customer:profiles!customer_profile_id (
          id,
          person_id,
          user_id,
          phone,
          email,
          address,
          city,
          country,
          notes,
          person:people (
            first_name,
            last_name
          )
        )
      `)
      .eq('farrier_profile_id', input.farrierProfileId)
      .order('created_at', { ascending: false });

    const { data: relationsData, error: relationsError } = await query;

    if (relationsError) {
      return {
        success: false,
        error: 'Errore durante il recupero dei clienti',
      };
    }

    // Mappare i dati
    let customers: Customer[] = (relationsData || []).map((rel) => {
      const profile = rel.customer as any;
      const person = profile.person;

      return {
        profileId: profile.id,
        personId: profile.person_id,
        firstName: person.first_name,
        lastName: person.last_name,
        phone: profile.phone,
        email: profile.email,
        address: profile.address,
        city: profile.city,
        country: profile.country,
        notes: profile.notes,
        hasAccount: !!profile.user_id,
        relationCreatedAt: rel.created_at,
      };
    });

    // Applicare filtro di ricerca se fornito
    if (input.searchTerm) {
      const searchLower = input.searchTerm.toLowerCase();
      customers = customers.filter(
        (c) =>
          c.firstName.toLowerCase().includes(searchLower) ||
          c.lastName.toLowerCase().includes(searchLower) ||
          c.phone?.toLowerCase().includes(searchLower) ||
          c.email?.toLowerCase().includes(searchLower)
      );
    }

    return {
      success: true,
      customers,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
