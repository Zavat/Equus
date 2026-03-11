import { supabase } from '@/lib/supabase';

/**
 * UC-03: Creare cliente senza account
 *
 * Attore: Farrier
 * Descrizione: Il farrier crea un profilo cliente per qualcuno che non ha ancora un account
 */

interface CreateCustomerWithoutAccountInput {
  farrierUserId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  notes?: string;
}

interface CreateCustomerWithoutAccountResult {
  success: boolean;
  profileId?: string;
  error?: string;
}

export async function createCustomerWithoutAccount(
  input: CreateCustomerWithoutAccountInput
): Promise<CreateCustomerWithoutAccountResult> {
  try {
    // Step 1: Creare record in people
    const { data: personData, error: personError } = await supabase
      .from('people')
      .insert({
        first_name: input.firstName,
        last_name: input.lastName,
      })
      .select('id')
      .single();

    if (personError || !personData) {
      return {
        success: false,
        error: 'Errore durante la creazione della persona',
      };
    }

    // Step 2: Creare record in profiles con source='farrier' e user_id=NULL
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        person_id: personData.id,
        source: 'farrier',
        user_id: null,
        phone: input.phone,
        email: input.email,
        address: input.address,
        city: input.city,
        country: input.country,
        postal_code: input.postalCode,
        notes: input.notes,
      })
      .select('id')
      .single();

    if (profileError || !profileData) {
      return {
        success: false,
        error: 'Errore durante la creazione del profilo cliente',
      };
    }

    return {
      success: true,
      profileId: profileData.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
