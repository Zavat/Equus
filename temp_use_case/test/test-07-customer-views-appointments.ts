import { supabase } from '@/lib/supabase';
import { listCustomerAppointments } from '../05-appointments/uc-15-list-customer-appointments';

/**
 * TEST 07: Cliente Visualizza e Gestisce Prenotazioni
 *
 * Flusso:
 * 1. Cliente autenticato visualizza i propri appuntamenti
 * 2. Verifica che veda solo i propri appuntamenti
 * 3. Verifica filtri (pending, confirmed, completed)
 * 4. Verifica ordinamento per data
 * 5. Verifica che NON veda appuntamenti di altri clienti
 */

interface TestResult {
  success: boolean;
  testName: string;
  duration?: number;
  steps?: StepResult[];
  error?: string;
  data?: {
    appointmentCount?: number;
    pendingCount?: number;
    confirmedCount?: number;
    completedCount?: number;
  };
}

interface StepResult {
  stepName: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

export async function testCustomerViewsAppointments(
  customerUserId: string,
  expectedAppointmentIds: string[]
): Promise<TestResult> {
  const startTime = Date.now();
  const steps: StepResult[] = [];

  try {
    // STEP 1: Ottenere customer profile
    console.log('🔍 Step 1: Getting customer profile...');
    const step1Start = Date.now();

    const { data: customerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', customerUserId)
      .maybeSingle();

    steps.push({
      stepName: 'Get Customer Profile',
      success: !profileError && customerProfile !== null,
      duration: Date.now() - step1Start,
      error: profileError?.message,
      data: customerProfile,
    });

    if (profileError || !customerProfile) {
      throw new Error('Customer profile not found');
    }

    const customerProfileId = customerProfile.id;
    console.log('✅ Customer profile found:', customerProfileId);

    // STEP 2: Recuperare tutti gli appuntamenti del cliente
    console.log('📝 Step 2: Listing customer appointments...');
    const step2Start = Date.now();

    const listResult = await listCustomerAppointments(customerUserId);

    steps.push({
      stepName: 'List Customer Appointments',
      success: listResult.success,
      duration: Date.now() - step2Start,
      error: listResult.error,
      data: listResult.data,
    });

    if (!listResult.success) {
      throw new Error(`Listing failed: ${listResult.error}`);
    }

    const appointments = listResult.data!.appointments;
    console.log('✅ Appointments retrieved:', appointments.length);

    // STEP 3: Verifica che veda tutti i suoi appuntamenti
    console.log('🔍 Step 3: Verifying all expected appointments are visible...');
    const step3Start = Date.now();

    const allExpectedVisible = expectedAppointmentIds.every((id) =>
      appointments.some((apt) => apt.id === id)
    );

    steps.push({
      stepName: 'Verify All Expected Appointments',
      success: allExpectedVisible && appointments.length === expectedAppointmentIds.length,
      duration: Date.now() - step3Start,
      data: {
        expected: expectedAppointmentIds.length,
        actual: appointments.length,
      },
    });

    if (!allExpectedVisible) {
      throw new Error('Not all expected appointments are visible');
    }

    console.log('✅ All expected appointments visible');

    // STEP 4: Verifica RLS - query diretta dovrebbe vedere solo propri appuntamenti
    console.log('🔍 Step 4: Testing RLS - direct query...');
    const step4Start = Date.now();

    const { data: allAppointments, error: allAppointmentsError } = await supabase
      .from('appointments')
      .select('id, customer_profile_id');

    const onlyOwnAppointments =
      !allAppointmentsError &&
      allAppointments !== null &&
      allAppointments.every((apt) => apt.customer_profile_id === customerProfileId);

    steps.push({
      stepName: 'Test RLS - Only Own Appointments',
      success: onlyOwnAppointments,
      duration: Date.now() - step4Start,
      error: allAppointmentsError?.message,
      data: {
        totalVisible: allAppointments?.length,
        allBelongToCustomer: onlyOwnAppointments,
      },
    });

    if (!onlyOwnAppointments) {
      throw new Error('RLS policy failed - can see other customers appointments');
    }

    console.log('✅ RLS verified - can only see own appointments');

    // STEP 5: Filtrare per status 'pending'
    console.log('🔍 Step 5: Testing filter by pending status...');
    const step5Start = Date.now();

    const { data: pendingAppointments, error: pendingError } = await supabase
      .from('appointments')
      .select('*')
      .eq('customer_profile_id', customerProfileId)
      .eq('status', 'pending');

    const pendingCount = pendingAppointments?.length || 0;

    steps.push({
      stepName: 'Filter Pending Appointments',
      success: !pendingError,
      duration: Date.now() - step5Start,
      error: pendingError?.message,
      data: { pendingCount },
    });

    if (pendingError) {
      throw new Error('Filtering pending appointments failed');
    }

    console.log('✅ Pending appointments filtered:', pendingCount);

    // STEP 6: Filtrare per status 'confirmed'
    console.log('🔍 Step 6: Testing filter by confirmed status...');
    const step6Start = Date.now();

    const { data: confirmedAppointments, error: confirmedError } = await supabase
      .from('appointments')
      .select('*')
      .eq('customer_profile_id', customerProfileId)
      .eq('status', 'confirmed');

    const confirmedCount = confirmedAppointments?.length || 0;

    steps.push({
      stepName: 'Filter Confirmed Appointments',
      success: !confirmedError,
      duration: Date.now() - step6Start,
      error: confirmedError?.message,
      data: { confirmedCount },
    });

    if (confirmedError) {
      throw new Error('Filtering confirmed appointments failed');
    }

    console.log('✅ Confirmed appointments filtered:', confirmedCount);

    // STEP 7: Filtrare per status 'completed'
    console.log('🔍 Step 7: Testing filter by completed status...');
    const step7Start = Date.now();

    const { data: completedAppointments, error: completedError } = await supabase
      .from('appointments')
      .select('*')
      .eq('customer_profile_id', customerProfileId)
      .eq('status', 'completed');

    const completedCount = completedAppointments?.length || 0;

    steps.push({
      stepName: 'Filter Completed Appointments',
      success: !completedError,
      duration: Date.now() - step7Start,
      error: completedError?.message,
      data: { completedCount },
    });

    if (completedError) {
      throw new Error('Filtering completed appointments failed');
    }

    console.log('✅ Completed appointments filtered:', completedCount);

    // STEP 8: Verifica ordinamento per data
    console.log('🔍 Step 8: Testing ordering by date...');
    const step8Start = Date.now();

    const { data: orderedAppointments, error: orderError } = await supabase
      .from('appointments')
      .select('id, scheduled_at')
      .eq('customer_profile_id', customerProfileId)
      .order('scheduled_at', { ascending: true });

    let isOrdered = true;
    if (orderedAppointments && orderedAppointments.length > 1) {
      for (let i = 1; i < orderedAppointments.length; i++) {
        const prevDate = new Date(orderedAppointments[i - 1].scheduled_at);
        const currDate = new Date(orderedAppointments[i].scheduled_at);
        if (prevDate > currDate) {
          isOrdered = false;
          break;
        }
      }
    }

    steps.push({
      stepName: 'Test Ordering by Date',
      success: !orderError && isOrdered,
      duration: Date.now() - step8Start,
      error: orderError?.message,
      data: orderedAppointments,
    });

    if (!isOrdered || orderError) {
      throw new Error('Ordering by date failed');
    }

    console.log('✅ Appointments correctly ordered by date');

    // STEP 9: Recuperare appuntamenti con cavalli (JOIN)
    console.log('🔍 Step 9: Testing appointments with horses join...');
    const step9Start = Date.now();

    const { data: appointmentsWithHorses, error: joinError } = await supabase
      .from('appointments')
      .select(
        `
        *,
        appointment_horses (
          horse_id,
          service_type,
          horses (
            id,
            name,
            breed
          )
        )
      `
      )
      .eq('customer_profile_id', customerProfileId);

    steps.push({
      stepName: 'Test Appointments with Horses Join',
      success: !joinError && appointmentsWithHorses !== null,
      duration: Date.now() - step9Start,
      error: joinError?.message,
      data: appointmentsWithHorses,
    });

    if (joinError) {
      throw new Error('Join with horses failed');
    }

    console.log('✅ Appointments with horses retrieved successfully');

    // Test completato con successo
    const totalDuration = Date.now() - startTime;

    return {
      success: true,
      testName: 'Customer Views Appointments',
      duration: totalDuration,
      steps,
      data: {
        appointmentCount: appointments.length,
        pendingCount,
        confirmedCount,
        completedCount,
      },
    };
  } catch (error) {
    return {
      success: false,
      testName: 'Customer Views Appointments',
      duration: Date.now() - startTime,
      steps,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
