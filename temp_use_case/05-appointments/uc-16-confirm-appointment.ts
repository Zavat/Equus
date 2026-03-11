import { supabase } from '@/lib/supabase';

/**
 * UC-16: Confermare prenotazione
 *
 * Attore: Farrier o Cliente
 * Descrizione: Conferma un appuntamento
 */

interface ConfirmAppointmentInput {
  appointmentId: string;
  userId: string;
  profileId: string;
}

interface ConfirmAppointmentResult {
  success: boolean;
  error?: string;
}

export async function confirmAppointment(
  input: ConfirmAppointmentInput
): Promise<ConfirmAppointmentResult> {
  try {
    // Verificare che l'appuntamento esista
    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, farrier_profile_id, customer_profile_id, status')
      .eq('id', input.appointmentId)
      .single();

    if (appointmentError || !appointmentData) {
      return {
        success: false,
        error: 'Appuntamento non trovato',
      };
    }

    // Verificare che l'utente sia autorizzato (farrier o cliente)
    const isAuthorized =
      appointmentData.farrier_profile_id === input.profileId ||
      appointmentData.customer_profile_id === input.profileId;

    if (!isAuthorized) {
      return {
        success: false,
        error: 'Non sei autorizzato a confermare questo appuntamento',
      };
    }

    // Verificare lo stato corrente
    if (appointmentData.status === 'confirmed') {
      return {
        success: true,
      };
    }

    if (appointmentData.status === 'completed') {
      return {
        success: false,
        error: 'Non è possibile confermare un appuntamento già completato',
      };
    }

    if (appointmentData.status === 'cancelled') {
      return {
        success: false,
        error: 'Non è possibile confermare un appuntamento cancellato',
      };
    }

    // Aggiornare lo status a confirmed
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status: 'confirmed' })
      .eq('id', input.appointmentId);

    if (updateError) {
      return {
        success: false,
        error: 'Errore durante la conferma dell\'appuntamento',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
