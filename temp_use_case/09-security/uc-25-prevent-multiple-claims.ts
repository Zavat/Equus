import { supabase } from '@/lib/supabase';

/**
 * UC-25: Impedire claim multiplo
 *
 * Attore: Sistema
 * Descrizione: Previene che lo stesso profilo venga reclamato più volte
 */

interface PreventMultipleClaimsInput {
  profileId: string;
  userId: string;
}

interface PreventMultipleClaimsResult {
  success: boolean;
  canClaim: boolean;
  reason?: string;
  error?: string;
}

export async function preventMultipleClaims(
  input: PreventMultipleClaimsInput
): Promise<PreventMultipleClaimsResult> {
  try {
    // Step 1: Verificare che il profilo esista
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', input.profileId)
      .single();

    if (profileError || !profileData) {
      return {
        success: false,
        canClaim: false,
        error: 'Profilo non trovato',
      };
    }

    // Step 2: Verificare che il profilo non sia già collegato a un utente
    if (profileData.user_id !== null) {
      return {
        success: true,
        canClaim: false,
        reason: 'Profilo già collegato a un utente',
      };
    }

    // Step 3: Verificare che l'utente non abbia già un profilo
    const { data: existingProfile, error: existingProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', input.userId)
      .maybeSingle();

    if (existingProfileError) {
      return {
        success: false,
        canClaim: false,
        error: 'Errore durante la verifica dei profili esistenti',
      };
    }

    if (existingProfile) {
      return {
        success: true,
        canClaim: false,
        reason: 'Utente ha già un profilo collegato',
      };
    }

    // Step 4: Verificare che non ci siano inviti già reclamati per questo profilo
    const { data: claimedInvitations, error: invitationsError } = await supabase
      .from('profile_invitations')
      .select('id')
      .eq('profile_id', input.profileId)
      .eq('status', 'claimed')
      .maybeSingle();

    if (invitationsError) {
      return {
        success: false,
        canClaim: false,
        error: 'Errore durante la verifica degli inviti',
      };
    }

    if (claimedInvitations) {
      return {
        success: true,
        canClaim: false,
        reason: 'Esiste già un invito reclamato per questo profilo',
      };
    }

    // Tutto ok, il claim può procedere
    return {
      success: true,
      canClaim: true,
    };
  } catch (error) {
    return {
      success: false,
      canClaim: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
