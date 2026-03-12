import { supabase } from '@/lib/supabase';

/**
 * UC-13: Farrier crea prenotazione
 *
 * Attore: Farrier
 * Descrizione: Il farrier crea un appuntamento per un cliente
 */

interface CreateAppointmentInput {
  farrierProfileId: string;
  customerProfileId: string;
  proposedDate: string;
  confirmedDate?: string;
  numHorses?: number;
  sequenceOrder?: number;
  totalPrice?: number;
  notes?: string;
}

interface CreateAppointmentResult {
  success: boolean;
  appointmentId?: string;
  error?: string;
}

export async function createAppointment(
  input: CreateAppointmentInput
): Promise<CreateAppointmentResult> {
  try {
    // Verificare che esista la relazione farrier-cliente
    const { data: relationData, error: relationError } = await supabase
      .from('farrier_customer_relations')
      .select('id')
      .eq('farrier_profile_id', input.farrierProfileId)
      .eq('client_profile_id', input.customerProfileId)
      .maybeSingle();

    if (relationError || !relationData) {
      return {
        success: false,
        error: 'Relazione farrier-cliente non trovata',
      };
    }

    // Creare l'appuntamento
    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        farrier_profile_id: input.farrierProfileId,
        client_profile_id: input.customerProfileId,
        proposed_date: input.proposedDate,
        confirmed_date: input.confirmedDate || null,
        num_horses: input.numHorses || 0,
        sequence_order: input.sequenceOrder || 0,
        total_price: input.totalPrice || 0,
        notes: input.notes || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (appointmentError || !appointmentData) {
      console.error('Appointment error:', appointmentError);
      return {
        success: false,
        error: `Errore durante la creazione dell'appuntamento: ${appointmentError?.message}`,
      };
    }

    return {
      success: true,
      appointmentId: appointmentData.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
