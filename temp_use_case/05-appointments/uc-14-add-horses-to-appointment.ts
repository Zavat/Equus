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
      .select('id, farrier_profile_id, customer_profile_id')
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
      .select('id')
      .in('id', input.horseIds)
      .eq('owner_profile_id', appointmentData.customer_profile_id);

    if (horsesError) {
      return {
        success: false,
        error: 'Errore durante la verifica dei cavalli',
      };
    }

    const validHorseIds = horsesData?.map((h) => h.id) || [];

    if (validHorseIds.length === 0) {
      return {
        success: false,
        error: 'Nessun cavallo valido trovato per questo cliente',
      };
    }

    // Creare le associazioni
    const appointmentHorses = validHorseIds.map((horseId) => ({
      appointment_id: input.appointmentId,
      horse_id: horseId,
    }));

    const { error: insertError } = await supabase
      .from('appointment_horses')
      .insert(appointmentHorses);

    if (insertError) {
      return {
        success: false,
        error: 'Errore durante l\'associazione dei cavalli all\'appuntamento',
      };
    }

    return {
      success: true,
      addedCount: validHorseIds.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
