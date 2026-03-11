import { supabase } from '@/lib/supabase';

/**
 * UC-17: Completare prenotazione
 *
 * Attore: Farrier
 * Descrizione: Marca un appuntamento come completato
 */

interface CompleteAppointmentInput {
  appointmentId: string;
  farrierProfileId: string;
  completionNotes?: string;
}

interface CompleteAppointmentResult {
  success: boolean;
  error?: string;
}

export async function completeAppointment(
  input: CompleteAppointmentInput
): Promise<CompleteAppointmentResult> {
  try {
    // Verificare che l'appuntamento esista e appartenga al farrier
    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, farrier_profile_id, status')
      .eq('id', input.appointmentId)
      .single();

    if (appointmentError || !appointmentData) {
      return {
        success: false,
        error: 'Appuntamento non trovato',
      };
    }

    if (appointmentData.farrier_profile_id !== input.farrierProfileId) {
      return {
        success: false,
        error: 'Non sei autorizzato a completare questo appuntamento',
      };
    }

    // Verificare lo stato corrente
    if (appointmentData.status === 'completed') {
      return {
        success: true,
      };
    }

    if (appointmentData.status === 'cancelled') {
      return {
        success: false,
        error: 'Non è possibile completare un appuntamento cancellato',
      };
    }

    // Aggiornare lo status a completed
    const updateData: Record<string, any> = {
      status: 'completed',
      completed_at: new Date().toISOString(),
    };

    if (input.completionNotes) {
      updateData.completion_notes = input.completionNotes;
    }

    const { error: updateError } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', input.appointmentId);

    if (updateError) {
      return {
        success: false,
        error: 'Errore durante il completamento dell\'appuntamento',
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
