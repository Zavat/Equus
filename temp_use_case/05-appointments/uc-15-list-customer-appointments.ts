import { supabase } from '@/lib/supabase';

/**
 * UC-15: Cliente visualizza prenotazioni
 *
 * Attore: Cliente
 * Descrizione: Il cliente visualizza le proprie prenotazioni
 */

interface ListCustomerAppointmentsInput {
  customerProfileId: string;
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  fromDate?: string;
  toDate?: string;
}

interface Appointment {
  id: string;
  farrierProfileId: string;
  scheduledAt: string;
  duration: number;
  location?: string;
  notes?: string;
  serviceType?: string;
  status: string;
  createdAt: string;
  horses?: Array<{
    id: string;
    name: string;
  }>;
}

interface ListCustomerAppointmentsResult {
  success: boolean;
  appointments?: Appointment[];
  error?: string;
}

export async function listCustomerAppointments(
  input: ListCustomerAppointmentsInput
): Promise<ListCustomerAppointmentsResult> {
  try {
    // Query base
    let query = supabase
      .from('appointments')
      .select(`
        id,
        farrier_profile_id,
        scheduled_at,
        duration,
        location,
        notes,
        service_type,
        status,
        created_at,
        appointment_horses (
          horse:horses (
            id,
            name
          )
        )
      `)
      .eq('customer_profile_id', input.customerProfileId)
      .order('scheduled_at', { ascending: false });

    // Filtri opzionali
    if (input.status) {
      query = query.eq('status', input.status);
    }

    if (input.fromDate) {
      query = query.gte('scheduled_at', input.fromDate);
    }

    if (input.toDate) {
      query = query.lte('scheduled_at', input.toDate);
    }

    const { data: appointmentsData, error: appointmentsError } = await query;

    if (appointmentsError) {
      return {
        success: false,
        error: 'Errore durante il recupero degli appuntamenti',
      };
    }

    // Mappare i dati
    const appointments: Appointment[] = (appointmentsData || []).map((apt) => ({
      id: apt.id,
      farrierProfileId: apt.farrier_profile_id,
      scheduledAt: apt.scheduled_at,
      duration: apt.duration,
      location: apt.location,
      notes: apt.notes,
      serviceType: apt.service_type,
      status: apt.status,
      createdAt: apt.created_at,
      horses: apt.appointment_horses?.map((ah: any) => ({
        id: ah.horse.id,
        name: ah.horse.name,
      })),
    }));

    return {
      success: true,
      appointments,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
