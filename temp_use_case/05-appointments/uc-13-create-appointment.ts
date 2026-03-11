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
  scheduledAt: string;
  duration?: number;
  location?: string;
  notes?: string;
  serviceType?: string;
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
      .eq('customer_profile_id', input.customerProfileId)
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
        customer_profile_id: input.customerProfileId,
        scheduled_at: input.scheduledAt,
        duration: input.duration || 60,
        location: input.location,
        notes: input.notes,
        service_type: input.serviceType,
        status: 'pending',
      })
      .select('id')
      .single();

    if (appointmentError || !appointmentData) {
      return {
        success: false,
        error: 'Errore durante la creazione dell\'appuntamento',
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
