import { supabase } from '@/lib/supabase';

/**
 * UC-01: Creare account utente
 *
 * Attore: Cliente
 * Descrizione: Processo di registrazione iniziale di un utente nel sistema
 */

interface CreateAccountInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface CreateAccountResult {
  success: boolean;
  userId?: string;
  profileId?: string;
  error?: string;
}

export async function createAccount(input: CreateAccountInput): Promise<CreateAccountResult> {
  try {
    // Step 1: Creare auth.users tramite Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
    });

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message || 'Errore durante la registrazione',
      };
    }

    const userId = authData.user.id;

    // Step 2: Creare record in people
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
        error: 'Errore durante la creazione del profilo personale',
      };
    }

    // Step 3: Creare record in profiles collegato a auth.users.id
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        person_id: personData.id,
        source: 'user',
      })
      .select('id')
      .single();

    if (profileError || !profileData) {
      return {
        success: false,
        error: 'Errore durante la creazione del profilo',
      };
    }

    return {
      success: true,
      userId: userId,
      profileId: profileData.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
