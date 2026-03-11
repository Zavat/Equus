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

// Wrapper function for backward compatibility with tests
export async function createCustomerProfile(
  farrierUserId: string,
  customerData: Omit<CreateCustomerWithoutAccountInput, 'farrierUserId'>
): Promise<CreateCustomerWithoutAccountResult> {
  return createCustomerWithoutAccount({
    farrierUserId,
    ...customerData,
  });
}

export async function createCustomerWithoutAccount(
  input: CreateCustomerWithoutAccountInput
): Promise<CreateCustomerWithoutAccountResult> {
  try {
    // Get farrier's profile ID from user ID
    const { data: farrierProfile, error: farrierError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', input.farrierUserId)
      .single();

    if (farrierError || !farrierProfile) {
      console.error('Farrier profile error:', farrierError);
      return {
        success: false,
        error: `Errore durante il recupero del profilo farrier: ${farrierError?.message}`,
      };
    }

    // Step 1: Creare record in people
    const { data: personData, error: personError } = await supabase
      .from('people')
      .insert({
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
        email: input.email,
      })
      .select('id')
      .single();

    if (personError || !personData) {
      console.error('Person creation error:', personError);
      return {
        success: false,
        error: `Errore durante la creazione della persona: ${personError?.message}`,
      };
    }

    // Step 2: Creare record in profiles con source='farrier' e user_id=NULL
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        person_id: personData.id,
        source: 'farrier',
        role: 'customer',
        user_id: null,
        created_by: farrierProfile.id,
        address: input.address,
        city: input.city,
        country: input.country,
      })
      .select('id')
      .single();

    if (profileError || !profileData) {
      console.error('Profile creation error:', profileError);
      return {
        success: false,
        error: `Errore durante la creazione del profilo cliente: ${profileError?.message}`,
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
