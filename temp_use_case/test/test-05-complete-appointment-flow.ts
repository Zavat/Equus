import { supabase } from '@/lib/supabase';
import { createAppointment } from '../05-appointments/uc-13-create-appointment';
import { confirmAppointment } from '../05-appointments/uc-16-confirm-appointment';
import { completeAppointment } from '../05-appointments/uc-17-complete-appointment';

/**
 * TEST 05: Flusso Completo Appuntamento
 *
 * Flusso:
 * 1. Farrier crea appuntamento per un cliente
 * 2. Verifica stato iniziale 'pending'
 * 3. Cliente/Farrier conferma appuntamento
 * 4. Verifica stato 'confirmed'
 * 5. Farrier completa appuntamento
 * 6. Verifica stato 'completed'
 */

interface TestResult {
  success: boolean;
  testName: string;
  duration?: number;
  steps?: StepResult[];
  error?: string;
  data?: {
    appointmentId?: string;
    farrierUserId?: string;
    customerProfileId?: string;
  };
}

interface StepResult {
  stepName: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

export async function testCompleteAppointmentFlow(
  farrierUserId: string,
  customerProfileId: string
): Promise<TestResult> {
  const startTime = Date.now();
  const steps: StepResult[] = [];

  try {
    // STEP 1: Ottenere farrier profile
    console.log('🔍 Step 1: Getting farrier profile...');
    const step1Start = Date.now();

    const { data: farrierProfile, error: farrierError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', farrierUserId)
      .maybeSingle();

    steps.push({
      stepName: 'Get Farrier Profile',
      success: !farrierError && farrierProfile !== null,
      duration: Date.now() - step1Start,
      error: farrierError?.message,
      data: farrierProfile,
    });

    if (farrierError || !farrierProfile) {
      throw new Error('Farrier profile not found');
    }

    const farrierProfileId = farrierProfile.id;
    console.log('✅ Farrier profile found:', farrierProfileId);

    // STEP 2: Creare appuntamento
    console.log('📝 Step 2: Creating appointment...');
    const step2Start = Date.now();

    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 7); // +7 giorni

    const createResult = await createAppointment(farrierUserId, {
      customerProfileId,
      scheduledAt: appointmentDate.toISOString(),
      location: 'Scuderia Centrale, Via Roma 123, Milano',
      notes: 'Ferratura completa, controllare zoccoli anteriori',
      estimatedDuration: 120, // 2 ore
    });

    steps.push({
      stepName: 'Create Appointment',
      success: createResult.success,
      duration: Date.now() - step2Start,
      error: createResult.error,
      data: createResult.data,
    });

    if (!createResult.success) {
      throw new Error(`Appointment creation failed: ${createResult.error}`);
    }

    const appointmentId = createResult.data!.appointmentId;
    console.log('✅ Appointment created:', appointmentId);

    // STEP 3: Verifica stato iniziale 'pending'
    console.log('🔍 Step 3: Verifying initial status is pending...');
    const step3Start = Date.now();

    const { data: pendingAppointment, error: pendingError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .maybeSingle();

    const isPending =
      !pendingError &&
      pendingAppointment !== null &&
      pendingAppointment.status === 'pending';

    steps.push({
      stepName: 'Verify Pending Status',
      success: isPending,
      duration: Date.now() - step3Start,
      error: pendingError?.message,
      data: pendingAppointment,
    });

    if (!isPending) {
      throw new Error('Appointment not in pending status');
    }

    console.log('✅ Appointment is pending');

    // STEP 4: Confermare appuntamento
    console.log('📝 Step 4: Confirming appointment...');
    const step4Start = Date.now();

    const confirmResult = await confirmAppointment(farrierUserId, appointmentId);

    steps.push({
      stepName: 'Confirm Appointment',
      success: confirmResult.success,
      duration: Date.now() - step4Start,
      error: confirmResult.error,
      data: confirmResult.data,
    });

    if (!confirmResult.success) {
      throw new Error(`Confirmation failed: ${confirmResult.error}`);
    }

    console.log('✅ Appointment confirmed');

    // STEP 5: Verifica stato 'confirmed'
    console.log('🔍 Step 5: Verifying confirmed status...');
    const step5Start = Date.now();

    const { data: confirmedAppointment, error: confirmedError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .maybeSingle();

    const isConfirmed =
      !confirmedError &&
      confirmedAppointment !== null &&
      confirmedAppointment.status === 'confirmed';

    steps.push({
      stepName: 'Verify Confirmed Status',
      success: isConfirmed,
      duration: Date.now() - step5Start,
      error: confirmedError?.message,
      data: confirmedAppointment,
    });

    if (!isConfirmed) {
      throw new Error('Appointment not in confirmed status');
    }

    console.log('✅ Appointment is confirmed');

    // STEP 6: Completare appuntamento
    console.log('📝 Step 6: Completing appointment...');
    const step6Start = Date.now();

    const completeResult = await completeAppointment(farrierUserId, appointmentId, {
      completionNotes: 'Ferratura completata con successo. Prossimo appuntamento tra 6 settimane.',
      actualDuration: 110,
    });

    steps.push({
      stepName: 'Complete Appointment',
      success: completeResult.success,
      duration: Date.now() - step6Start,
      error: completeResult.error,
      data: completeResult.data,
    });

    if (!completeResult.success) {
      throw new Error(`Completion failed: ${completeResult.error}`);
    }

    console.log('✅ Appointment completed');

    // STEP 7: Verifica stato 'completed' e completed_at
    console.log('🔍 Step 7: Verifying completed status...');
    const step7Start = Date.now();

    const { data: completedAppointment, error: completedError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .maybeSingle();

    const isCompleted =
      !completedError &&
      completedAppointment !== null &&
      completedAppointment.status === 'completed' &&
      completedAppointment.completed_at !== null;

    steps.push({
      stepName: 'Verify Completed Status',
      success: isCompleted,
      duration: Date.now() - step7Start,
      error: completedError?.message,
      data: completedAppointment,
    });

    if (!isCompleted) {
      throw new Error('Appointment not properly completed');
    }

    console.log('✅ Appointment is completed with timestamp');

    // STEP 8: Verifica che non si possa confermare un appuntamento già completato
    console.log('🔍 Step 8: Testing cannot confirm completed appointment...');
    const step8Start = Date.now();

    const invalidConfirmResult = await confirmAppointment(farrierUserId, appointmentId);

    const cannotConfirmCompleted = !invalidConfirmResult.success;

    steps.push({
      stepName: 'Prevent Confirming Completed',
      success: cannotConfirmCompleted,
      duration: Date.now() - step8Start,
      error: invalidConfirmResult.error,
      data: invalidConfirmResult,
    });

    if (!cannotConfirmCompleted) {
      throw new Error('Completed appointment can be confirmed (should not be possible)');
    }

    console.log('✅ Cannot confirm completed appointment');

    // Test completato con successo
    const totalDuration = Date.now() - startTime;

    return {
      success: true,
      testName: 'Complete Appointment Flow',
      duration: totalDuration,
      steps,
      data: {
        appointmentId,
        farrierUserId,
        customerProfileId,
      },
    };
  } catch (error) {
    return {
      success: false,
      testName: 'Complete Appointment Flow',
      duration: Date.now() - startTime,
      steps,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Cleanup helper
 */
export async function cleanupAppointmentTest(appointmentId: string): Promise<void> {
  console.log('🧹 Cleaning up appointment test data...');

  try {
    // 1. Elimina appointment_horses
    await supabase.from('appointment_horses').delete().eq('appointment_id', appointmentId);

    // 2. Elimina appointment
    await supabase.from('appointments').delete().eq('id', appointmentId);

    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}
