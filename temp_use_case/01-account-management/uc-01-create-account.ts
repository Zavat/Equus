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
  role?: 'farrier' | 'customer';
}

interface CreateAccountResult {
  success: boolean;
  data?: {
    userId: string;
    profileId: string;
    personId?: string;
  };
  error?: string;
}

export async function createAccount(input: CreateAccountInput): Promise<CreateAccountResult> {
  try {
    // Step 1: Creare auth.users tramite Supabase
    // Il trigger database creerà automaticamente un profilo
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          role: input.role || 'customer',
        },
      },
    });

    if (authError || !authData.user) {
      console.error('Auth error:', authError);
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
      console.error('Person error:', personError);
      return {
        success: false,
        error: `Errore durante la creazione del profilo personale: ${personError?.message}`,
      };
    }

    // Step 3: Aggiornare il profilo creato dal trigger con person_id
    // Il trigger ha già creato il profilo base, ora lo colleghiamo a people
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .update({ person_id: personData.id })
      .eq('user_id', userId)
      .select('id')
      .single();

    if (profileError || !profileData) {
      console.error('Profile error:', profileError);
      return {
        success: false,
        error: `Errore durante l'aggiornamento del profilo: ${profileError?.message}`,
      };
    }

    return {
      success: true,
      data: {
        userId: userId,
        profileId: profileData.id,
        personId: personData.id,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
