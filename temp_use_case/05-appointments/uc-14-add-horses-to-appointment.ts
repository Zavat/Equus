import { supabase } from '@/lib/supabase';

/**
 * UC-14: Aggiungere cavalli alla prenotazione
 *
 * Attore: Farrier
 * Descrizione: Associa uno o più cavalli ad un appuntamento
 */

interface AddHorsesToAppointmentInput {
  appointmentId: string;
  horseIds: string[];
  farrierProfileId: string;
}

interface AddHorsesToAppointmentResult {
  success: boolean;
  addedCount?: number;
  error?: string;
}

export async function addHorsesToAppointment(
  input: AddHorsesToAppointmentInput
): Promise<AddHorsesToAppointmentResult> {
  try {
    // Verificare che l'appuntamento esista e appartenga al farrier
    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, farrier_profile_id, client_profile_id')
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
        error: 'Non sei autorizzato a modificare questo appuntamento',
      };
    }

    // Verificare che i cavalli appartengano al cliente
    const { data: horsesData, error: horsesError } = await supabase
      .from('horses')
      .select('id, work_type')
      .in('id', input.horseIds)
      .eq('owner_profile_id', appointmentData.client_profile_id);

    if (horsesError) {
      return {
        success: false,
        error: 'Errore durante la verifica dei cavalli',
      };
    }

    if (!horsesData || horsesData.length === 0) {
      return {
        success: false,
        error: 'Nessun cavallo valido trovato per questo cliente',
      };
    }

    // Creare le associazioni
    const appointmentHorses = horsesData.map((horse) => ({
      appointment_id: input.appointmentId,
      horse_id: horse.id,
      work_type: horse.work_type,
    }));

    const { error: insertError } = await supabase
      .from('appointment_horses')
      .insert(appointmentHorses);

    if (insertError) {
      console.error('Insert error:', insertError);
      return {
        success: false,
        error: `Errore durante l'associazione dei cavalli all'appuntamento: ${insertError.message}`,
      };
    }

    return {
      success: true,
      addedCount: horsesData.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
