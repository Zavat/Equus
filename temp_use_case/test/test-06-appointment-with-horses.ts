import { supabase } from '@/lib/supabase';
import { createAppointment } from '../05-appointments/uc-13-create-appointment';
import { addHorsesToAppointment } from '../05-appointments/uc-14-add-horses-to-appointment';
import { farrierAddHorse } from '../04-horses/uc-08-farrier-add-horse';

/**
 * TEST 06: Appuntamento con Gestione Cavalli
 *
 * Flusso:
 * 1. Farrier crea alcuni cavalli per il cliente
 * 2. Farrier crea appuntamento
 * 3. Farrier aggiunge cavalli all'appuntamento
 * 4. Verifica che i cavalli siano correttamente associati
 * 5. Verifica che si possano recuperare cavalli dall'appuntamento
 */

interface TestResult {
  success: boolean;
  testName: string;
  duration?: number;
  steps?: StepResult[];
  error?: string;
  data?: {
    appointmentId?: string;
    horseIds?: string[];
  };
}

interface StepResult {
  stepName: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

export async function testAppointmentWithHorses(
  farrierUserId: string,
  customerProfileId: string
): Promise<TestResult> {
  const startTime = Date.now();
  const steps: StepResult[] = [];
  const horseIds: string[] = [];

  try {
    // STEP 1: Creare cavalli per il cliente
    console.log('📝 Step 1: Creating horses for customer...');
    const step1Start = Date.now();

    const horses = [
      {
        name: 'Thunder',
        breed: 'Purosangue Inglese',
        birthYear: 2018,
        color: 'Baio',
        microchipNumber: 'IT123456789',
      },
      {
        name: 'Lightning',
        breed: 'Quarter Horse',
        birthYear: 2019,
        color: 'Palomino',
        microchipNumber: 'IT987654321',
      },
      {
        name: 'Storm',
        breed: 'Sella Italiano',
        birthYear: 2020,
        color: 'Sauro',
        microchipNumber: 'IT456789123',
      },
    ];

    let allHorsesCreated = true;
    const createdHorses = [];

    for (const horseData of horses) {
      const horseResult = await farrierAddHorse(farrierUserId, {
        ownerProfileId: customerProfileId,
        name: horseData.name,
        breed: horseData.breed,
        birthYear: horseData.birthYear,
        color: horseData.color,
        microchipNumber: horseData.microchipNumber,
      });

      if (horseResult.success && horseResult.data?.horseId) {
        horseIds.push(horseResult.data.horseId);
        createdHorses.push(horseResult.data);
      } else {
        allHorsesCreated = false;
        break;
      }
    }

    steps.push({
      stepName: 'Create Horses',
      success: allHorsesCreated && horseIds.length === 3,
      duration: Date.now() - step1Start,
      data: { createdHorses, horseIds },
    });

    if (!allHorsesCreated) {
      throw new Error('Failed to create all horses');
    }

    console.log('✅ Horses created:', horseIds);

    // STEP 2: Creare appuntamento
    console.log('📝 Step 2: Creating appointment...');
    const step2Start = Date.now();

    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 3);

    const appointmentResult = await createAppointment(farrierUserId, {
      customerProfileId,
      scheduledAt: appointmentDate.toISOString(),
      location: 'Maneggio Il Cavallo Felice, Via Dante 45, Roma',
      notes: 'Ferratura completa per tutti e 3 i cavalli',
      estimatedDuration: 180, // 3 ore per 3 cavalli
    });

    steps.push({
      stepName: 'Create Appointment',
      success: appointmentResult.success,
      duration: Date.now() - step2Start,
      error: appointmentResult.error,
      data: appointmentResult.data,
    });

    if (!appointmentResult.success) {
      throw new Error(`Appointment creation failed: ${appointmentResult.error}`);
    }

    const appointmentId = appointmentResult.data!.appointmentId;
    console.log('✅ Appointment created:', appointmentId);

    // STEP 3: Aggiungere cavalli all'appuntamento
    console.log('📝 Step 3: Adding horses to appointment...');
    const step3Start = Date.now();

    const addHorsesResult = await addHorsesToAppointment(farrierUserId, appointmentId, {
      horseIds,
      services: [
        {
          horseId: horseIds[0],
          serviceType: 'full_shoeing',
          notes: 'Anteriori e posteriori, controllo zoccoli',
        },
        {
          horseId: horseIds[1],
          serviceType: 'full_shoeing',
          notes: 'Solo anteriori',
        },
        {
          horseId: horseIds[2],
          serviceType: 'trimming',
          notes: 'Pareggio semplice',
        },
      ],
    });

    steps.push({
      stepName: 'Add Horses to Appointment',
      success: addHorsesResult.success,
      duration: Date.now() - step3Start,
      error: addHorsesResult.error,
      data: addHorsesResult.data,
    });

    if (!addHorsesResult.success) {
      throw new Error(`Adding horses failed: ${addHorsesResult.error}`);
    }

    console.log('✅ Horses added to appointment');

    // STEP 4: Verifica associazioni in appointment_horses
    console.log('🔍 Step 4: Verifying appointment_horses records...');
    const step4Start = Date.now();

    const { data: appointmentHorses, error: appointmentHorsesError } = await supabase
      .from('appointment_horses')
      .select('*')
      .eq('appointment_id', appointmentId);

    const allHorsesAssociated =
      !appointmentHorsesError &&
      appointmentHorses !== null &&
      appointmentHorses.length === 3 &&
      horseIds.every((id) =>
        appointmentHorses.some((ah) => ah.horse_id === id)
      );

    steps.push({
      stepName: 'Verify Appointment Horses',
      success: allHorsesAssociated,
      duration: Date.now() - step4Start,
      error: appointmentHorsesError?.message,
      data: appointmentHorses,
    });

    if (!allHorsesAssociated) {
      throw new Error('Not all horses are associated with appointment');
    }

    console.log('✅ All horses associated with appointment');

    // STEP 5: Recuperare cavalli dall'appuntamento con JOIN
    console.log('🔍 Step 5: Retrieving horses with appointment...');
    const step5Start = Date.now();

    const { data: appointmentWithHorses, error: joinError } = await supabase
      .from('appointments')
      .select(
        `
        *,
        appointment_horses (
          horse_id,
          service_type,
          notes,
          horses (
            id,
            name,
            breed,
            color
          )
        )
      `
      )
      .eq('id', appointmentId)
      .maybeSingle();

    const hasAllHorsesInJoin =
      !joinError &&
      appointmentWithHorses !== null &&
      appointmentWithHorses.appointment_horses &&
      appointmentWithHorses.appointment_horses.length === 3;

    steps.push({
      stepName: 'Retrieve Horses with Join',
      success: hasAllHorsesInJoin,
      duration: Date.now() - step5Start,
      error: joinError?.message,
      data: appointmentWithHorses,
    });

    if (!hasAllHorsesInJoin) {
      throw new Error('Could not retrieve horses with appointment');
    }

    console.log('✅ Successfully retrieved horses with appointment');

    // STEP 6: Verifica che tutti i cavalli abbiano verified_by_user=false
    console.log('🔍 Step 6: Verifying horses need customer verification...');
    const step6Start = Date.now();

    const { data: horsesVerification, error: verificationError } = await supabase
      .from('horses')
      .select('id, name, verified_by_user, source')
      .in('id', horseIds);

    const allNeedVerification =
      !verificationError &&
      horsesVerification !== null &&
      horsesVerification.every(
        (h) => h.source === 'farrier' && h.verified_by_user === false
      );

    steps.push({
      stepName: 'Verify Horses Need Verification',
      success: allNeedVerification,
      duration: Date.now() - step6Start,
      error: verificationError?.message,
      data: horsesVerification,
    });

    if (!allNeedVerification) {
      throw new Error('Horse verification status incorrect');
    }

    console.log('✅ All horses correctly marked as needing verification');

    // Test completato con successo
    const totalDuration = Date.now() - startTime;

    return {
      success: true,
      testName: 'Appointment with Horses',
      duration: totalDuration,
      steps,
      data: {
        appointmentId,
        horseIds,
      },
    };
  } catch (error) {
    return {
      success: false,
      testName: 'Appointment with Horses',
      duration: Date.now() - startTime,
      steps,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Cleanup helper
 */
export async function cleanupAppointmentWithHorsesTest(
  appointmentId: string,
  horseIds: string[]
): Promise<void> {
  console.log('🧹 Cleaning up appointment with horses test data...');

  try {
    // 1. Elimina appointment_horses
    await supabase.from('appointment_horses').delete().eq('appointment_id', appointmentId);

    // 2. Elimina appointment
    await supabase.from('appointments').delete().eq('id', appointmentId);

    // 3. Elimina horses
    if (horseIds.length > 0) {
      await supabase.from('horses').delete().in('id', horseIds);
    }

    // 4. Logout
    await supabase.auth.signOut();

    console.log('✅ Cleanup completed (including logout)');
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}
