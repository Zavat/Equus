import { supabase } from '@/lib/supabase';

/**
 * UC-24: Validare token invito
 *
 * Attore: Sistema
 * Descrizione: Verifica la validità di un token di invito
 */

interface ValidateInvitationTokenInput {
  claimToken: string;
}

interface ValidateInvitationTokenResult {
  success: boolean;
  valid: boolean;
  invitationId?: string;
  profileId?: string;
  expiresAt?: string;
  reason?: string;
  error?: string;
}

export async function validateInvitationToken(
  input: ValidateInvitationTokenInput
): Promise<ValidateInvitationTokenResult> {
  try {
    // Step 1: Verificare che il token esista
    const { data: invitationData, error: invitationError } = await supabase
      .from('profile_invitations')
      .select('id, profile_id, status, expires_at')
      .eq('claim_token', input.claimToken)
      .maybeSingle();

    if (invitationError) {
      return {
        success: false,
        valid: false,
        error: 'Errore durante la validazione del token',
      };
    }

    if (!invitationData) {
      return {
        success: true,
        valid: false,
        reason: 'Token non trovato',
      };
    }

    // Step 2: Verificare che non sia già stato usato
    if (invitationData.status === 'claimed') {
      return {
        success: true,
        valid: false,
        invitationId: invitationData.id,
        reason: 'Token già utilizzato',
      };
    }

    // Step 3: Verificare che non sia scaduto
    const now = new Date();
    const expiresAt = new Date(invitationData.expires_at);

    if (expiresAt < now) {
      // Aggiornare automaticamente lo status a expired
      await supabase
        .from('profile_invitations')
        .update({ status: 'expired' })
        .eq('id', invitationData.id);

      return {
        success: true,
        valid: false,
        invitationId: invitationData.id,
        expiresAt: invitationData.expires_at,
        reason: 'Token scaduto',
      };
    }

    // Step 4: Verificare che il profilo non sia già stato reclamato
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', invitationData.profile_id)
      .single();

    if (profileError) {
      return {
        success: false,
        valid: false,
        error: 'Errore durante la verifica del profilo',
      };
    }

    if (profileData.user_id) {
      return {
        success: true,
        valid: false,
        invitationId: invitationData.id,
        profileId: invitationData.profile_id,
        reason: 'Profilo già reclamato',
      };
    }

    // Token valido
    return {
      success: true,
      valid: true,
      invitationId: invitationData.id,
      profileId: invitationData.profile_id,
      expiresAt: invitationData.expires_at,
    };
  } catch (error) {
    return {
      success: false,
      valid: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
