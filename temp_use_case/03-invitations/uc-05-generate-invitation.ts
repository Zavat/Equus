import { supabase } from '@/lib/supabase';

/**
 * UC-05: Generare invito cliente
 *
 * Attore: Farrier
 * Descrizione: Il farrier genera un invito per permettere al cliente di reclamare il proprio profilo
 */

interface GenerateInvitationInput {
  farrierProfileId: string;
  customerProfileId: string;
  expiresInDays?: number;
}

interface GenerateInvitationResult {
  success: boolean;
  invitationId?: string;
  claimToken?: string;
  expiresAt?: string;
  error?: string;
  data?: {
    token: string;
    expiresAt: string;
  };
}

// Wrapper for backward compatibility with tests
export async function generateInvitation(
  farrierUserIdOrInput: string | GenerateInvitationInput,
  customerProfileId?: string,
  expiresInDays?: number
): Promise<GenerateInvitationResult>;

export async function generateInvitation(
  input: GenerateInvitationInput
): Promise<GenerateInvitationResult>;

export async function generateInvitation(
  farrierUserIdOrInput: string | GenerateInvitationInput,
  customerProfileId?: string,
  expiresInDays?: number
): Promise<GenerateInvitationResult> {
  // Handle both call signatures
  let input: GenerateInvitationInput;

  if (typeof farrierUserIdOrInput === 'string') {
    // Legacy signature: generateInvitation(farrierUserId, customerProfileId, expiresInDays)
    // Need to convert farrierUserId to farrierProfileId
    const { data: farrierProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', farrierUserIdOrInput)
      .single();

    if (!farrierProfile) {
      return {
        success: false,
        error: 'Farrier profile not found',
      };
    }

    input = {
      farrierProfileId: farrierProfile.id,
      customerProfileId: customerProfileId!,
      expiresInDays,
    };
  } else {
    input = farrierUserIdOrInput;
  }
  try {
    // Verificare che il profilo cliente non abbia già un user_id
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', input.customerProfileId)
      .single();

    if (profileError) {
      console.error('Profile lookup error:', profileError);
      return {
        success: false,
        error: `Profilo cliente non trovato: ${profileError.message}`,
      };
    }

    if (!profileData) {
      return {
        success: false,
        error: 'Profilo cliente non trovato (no data)',
      };
    }

    if (profileData.user_id) {
      return {
        success: false,
        error: 'Il cliente ha già un account attivo',
      };
    }

    // Generare claim_token (UUID)
    const claimToken = crypto.randomUUID();

    // Calcolare data scadenza (default 30 giorni)
    const expiresInDays = input.expiresInDays || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Creare invito
    const { data: invitationData, error: invitationError } = await supabase
      .from('profile_invitations')
      .insert({
        profile_id: input.customerProfileId,
        farrier_profile_id: input.farrierProfileId,
        claim_token: claimToken,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select('id, claim_token, expires_at')
      .single();

    if (invitationError || !invitationData) {
      console.error('Invitation creation error:', invitationError);
      return {
        success: false,
        error: `Errore durante la creazione dell'invito: ${invitationError?.message}`,
      };
    }

    return {
      success: true,
      invitationId: invitationData.id,
      claimToken: invitationData.claim_token,
      expiresAt: invitationData.expires_at,
      data: {
        token: invitationData.claim_token,
        expiresAt: invitationData.expires_at,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
