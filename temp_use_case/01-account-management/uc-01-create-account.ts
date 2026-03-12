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
    // Il trigger database creerà automaticamente people + profile
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          role: input.role || 'customer',
          first_name: input.firstName,
          last_name: input.lastName,
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

    // Step 2: Recuperare il profilo e people creati dal trigger
    // Aspettiamo un momento per permettere al trigger di completare
    await new Promise(resolve => setTimeout(resolve, 100));

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, person_id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profileData) {
      console.error('Profile retrieval error:', profileError);
      return {
        success: false,
        error: `Errore durante il recupero del profilo: ${profileError?.message}`,
      };
    }

    return {
      success: true,
      data: {
        userId: userId,
        profileId: profileData.id,
        personId: profileData.person_id || undefined,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
