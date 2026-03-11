import { supabase } from '@/lib/supabase';

/**
 * UC-27: Scadenza inviti
 *
 * Attore: Sistema (Cron Job)
 * Descrizione: Gestisce automaticamente la scadenza degli inviti
 */

interface ExpireInvitationsResult {
  success: boolean;
  expiredCount?: number;
  error?: string;
}

export async function expireInvitations(): Promise<ExpireInvitationsResult> {
  try {
    const now = new Date().toISOString();

    // Trovare tutti gli inviti scaduti con status 'pending'
    const { data: expiredInvitations, error: selectError } = await supabase
      .from('profile_invitations')
      .select('id')
      .eq('status', 'pending')
      .lt('expires_at', now);

    if (selectError) {
      return {
        success: false,
        error: 'Errore durante la ricerca degli inviti scaduti',
      };
    }

    if (!expiredInvitations || expiredInvitations.length === 0) {
      return {
        success: true,
        expiredCount: 0,
      };
    }

    // Aggiornare lo status a 'expired'
    const expiredIds = expiredInvitations.map((inv) => inv.id);

    const { error: updateError } = await supabase
      .from('profile_invitations')
      .update({ status: 'expired' })
      .in('id', expiredIds);

    if (updateError) {
      return {
        success: false,
        error: 'Errore durante l\'aggiornamento degli inviti scaduti',
      };
    }

    return {
      success: true,
      expiredCount: expiredInvitations.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}

/**
 * Funzione da eseguire come cron job
 * Esempio di utilizzo con un timer:
 *
 * setInterval(async () => {
 *   const result = await expireInvitations();
 *   console.log(`Expired ${result.expiredCount} invitations`);
 * }, 3600000); // Ogni ora
 */
export async function runExpirationCronJob(): Promise<void> {
  console.log('[CRON] Starting invitation expiration job...');

  const result = await expireInvitations();

  if (result.success) {
    console.log(`[CRON] Successfully expired ${result.expiredCount} invitations`);
  } else {
    console.error(`[CRON] Error expiring invitations: ${result.error}`);
  }
}
