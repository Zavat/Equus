import { supabase } from '@/lib/supabase';

/**
 * UC-19: Cliente vede i propri farrier
 *
 * Attore: Cliente
 * Descrizione: Il cliente visualizza i farrier che lo seguono
 */

interface ListCustomerFarriersInput {
  customerProfileId: string;
}

interface Farrier {
  profileId: string;
  personId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  relationCreatedAt: string;
}

interface ListCustomerFarriersResult {
  success: boolean;
  farriers?: Farrier[];
  error?: string;
}

export async function listCustomerFarriers(
  input: ListCustomerFarriersInput
): Promise<ListCustomerFarriersResult> {
  try {
    // Query relazioni inverse con join su profiles e people
    const { data: relationsData, error: relationsError } = await supabase
      .from('farrier_customer_relations')
      .select(`
        created_at,
        farrier:profiles!farrier_profile_id (
          id,
          person_id,
          phone,
          email,
          address,
          city,
          country,
          person:people (
            first_name,
            last_name
          )
        )
      `)
      .eq('customer_profile_id', input.customerProfileId)
      .order('created_at', { ascending: false });

    if (relationsError) {
      return {
        success: false,
        error: 'Errore durante il recupero dei farrier',
      };
    }

    // Mappare i dati
    const farriers: Farrier[] = (relationsData || []).map((rel) => {
      const profile = rel.farrier as any;
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
        relationCreatedAt: rel.created_at,
      };
    });

    return {
      success: true,
      farriers,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
