import { supabase } from '@/lib/supabase';

/**
 * UC-07: Claim del profilo
 *
 * Attore: Cliente
 * Descrizione: Il cliente reclama il proprio profilo usando il token di invito
 */

interface ClaimProfileInput {
  claimToken: string;
  userId: string;
}

interface ClaimProfileResult {
  success: boolean;
  profileId?: string;
  error?: string;
}

export async function claimProfile(
  input: ClaimProfileInput
): Promise<ClaimProfileResult> {
  try {
    // Step 1: Validare il token
    const { data: invitationData, error: invitationError } = await supabase
      .from('profile_invitations')
      .select('id, profile_id, status, expires_at')
      .eq('claim_token', input.claimToken)
      .single();

    if (invitationError || !invitationData) {
      return {
        success: false,
        error: 'Token di invito non valido',
      };
    }

    // Verificare che non sia già stato reclamato
    if (invitationData.status === 'claimed') {
      return {
        success: false,
        error: 'Questo invito è già stato utilizzato',
      };
    }

    // Verificare che non sia scaduto
    if (new Date(invitationData.expires_at) < new Date()) {
      // Aggiornare lo status a expired
      await supabase
        .from('profile_invitations')
        .update({ status: 'expired' })
        .eq('id', invitationData.id);

      return {
        success: false,
        error: 'Questo invito è scaduto',
      };
    }

    // Step 2: Verificare che il profilo non sia già collegato
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', invitationData.profile_id)
      .single();

    if (profileError) {
      return {
        success: false,
        error: 'Profilo non trovato',
      };
    }

    if (profileData.user_id) {
      return {
        success: false,
        error: 'Questo profilo è già stato reclamato',
      };
    }

    // Step 3: Collegare il profilo all'utente
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ user_id: input.userId })
      .eq('id', invitationData.profile_id);

    if (updateProfileError) {
      return {
        success: false,
        error: 'Errore durante il collegamento del profilo',
      };
    }

    // Step 4: Aggiornare lo status dell'invito
    const { error: updateInvitationError } = await supabase
      .from('profile_invitations')
      .update({
        status: 'claimed',
        claimed_at: new Date().toISOString(),
      })
      .eq('id', invitationData.id);

    if (updateInvitationError) {
      // Non critico, il profilo è già stato collegato
      console.error('Errore durante l\'aggiornamento dello status dell\'invito');
    }

    return {
      success: true,
      profileId: invitationData.profile_id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
