import { supabase } from '@/lib/supabase';
import { createAccount } from '../01-account-management/uc-01-create-account';
import { createCustomerProfile } from '../02-customer-creation/uc-03-create-customer-without-account';
import { linkCustomerToFarrier } from '../02-customer-creation/uc-04-link-customer-to-farrier';
import { generateInvitation } from '../03-invitations/uc-05-generate-invitation';
import { farrierAddHorse } from '../04-horses/uc-08-farrier-add-horse';
import { createAppointment } from '../05-appointments/uc-13-create-appointment';
import { addHorsesToAppointment } from '../05-appointments/uc-14-add-horses-to-appointment';

/**
 * TEST 08: End-to-End - Dalla Creazione Cliente all'Appuntamento
 *
 * Questo è un test E2E completo che simula il flusso reale:
 * 1. Farrier si registra
 * 2. Farrier crea un cliente
 * 3. Farrier collega cliente
 * 4. Farrier genera invito
 * 5. Farrier aggiunge cavalli per il cliente
 * 6. Farrier crea appuntamento
 * 7. Farrier aggiunge cavalli all'appuntamento
 * 8. Verifica che tutto sia collegato correttamente
 */

interface TestResult {
  success: boolean;
  testName: string;
  duration?: number;
  steps?: StepResult[];
  error?: string;
  data?: {
    farrierUserId?: string;
    customerProfileId?: string;
    horseIds?: string[];
    appointmentId?: string;
    invitationToken?: string;
  };
}

interface StepResult {
  stepName: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

export async function testEndToEndFarrierCustomer(): Promise<TestResult> {
  const startTime = Date.now();
  const steps: StepResult[] = [];

  try {
    // STEP 1: Farrier si registra
    console.log('�� Step 1: Farrier registration...');
    const step1Start = Date.now();

    const farrierEmail = `e2e-farrier-${Date.now()}@example.com`;
    const farrierPassword = 'TestPassword123!';

    const farrierAccountResult = await createAccount({
      email: farrierEmail,
      password: farrierPassword,
      firstName: 'Marco',
      lastName: 'Ferrari',
      role: 'farrier',
    });

    steps.push({
      stepName: 'Farrier Registration',
      success: farrierAccountResult.success,
      duration: Date.now() - step1Start,
      error: farrierAccountResult.error,
      data: farrierAccountResult.data,
    });

    if (!farrierAccountResult.success) {
      throw new Error(`Farrier registration failed: ${farrierAccountResult.error}`);
    }

    const farrierUserId = farrierAccountResult.data!.userId;
    console.log('✅ Farrier registered:', farrierUserId);

    // STEP 2: Farrier crea cliente
    console.log('📝 Step 2: Creating customer...');
    const step2Start = Date.now();

    const customerResult = await createCustomerProfile(farrierUserId, {
      firstName: 'Giulia',
      lastName: 'Verdi',
      email: `giulia.verdi.${Date.now()}@example.com`,
      phone: '+39 345 678 9012',
      address: 'Via delle Rose 15, Bologna',
      notes: 'Cliente con 2 cavalli, appuntamenti ogni 6 settimane',
    });

    steps.push({
      stepName: 'Create Customer',
      success: customerResult.success,
      duration: Date.now() - step2Start,
      error: customerResult.error,
      data: customerResult.data,
    });

    if (!customerResult.success || !customerResult.profileId) {
      throw new Error(`Customer creation failed: ${customerResult.error}`);
    }

    const customerProfileId = customerResult.profileId;
    console.log('✅ Customer created:', customerProfileId);

    // STEP 3: Collegare cliente al farrier
    console.log('📝 Step 3: Linking customer to farrier...');
    const step3Start = Date.now();

    // Ottenere il farrier profile ID dal user ID
    const { data: farrierProfileForLink, error: farrierProfileForLinkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', farrierUserId)
      .maybeSingle();

    if (farrierProfileForLinkError || !farrierProfileForLink) {
      throw new Error('Farrier profile not found for linking');
    }

    const linkResult = await linkCustomerToFarrier({
      farrierProfileId: farrierProfileForLink.id,
      customerProfileId,
    });

    steps.push({
      stepName: 'Link Customer to Farrier',
      success: linkResult.success,
      duration: Date.now() - step3Start,
      error: linkResult.error,
      data: linkResult.data,
    });

    if (!linkResult.success) {
      throw new Error(`Linking failed: ${linkResult.error}`);
    }

    console.log('✅ Customer linked to farrier');

    // STEP 4: Generare invito
    console.log('📝 Step 4: Generating invitation...');
    const step4Start = Date.now();

    const invitationResult = await generateInvitation(farrierUserId, customerProfileId);

    steps.push({
      stepName: 'Generate Invitation',
      success: invitationResult.success,
      duration: Date.now() - step4Start,
      error: invitationResult.error,
      data: invitationResult.data,
    });

    if (!invitationResult.success) {
      throw new Error(`Invitation generation failed: ${invitationResult.error}`);
    }

    const invitationToken = invitationResult.data!.token;
    console.log('✅ Invitation generated:', invitationToken);

    // STEP 5: Aggiungere cavalli
    console.log('📝 Step 5: Adding horses...');
    const step5Start = Date.now();

    // Ottenere il farrier profile ID dal user ID
    const { data: farrierProfileData, error: farrierProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', farrierUserId)
      .maybeSingle();

    if (farrierProfileError || !farrierProfileData) {
      throw new Error('Farrier profile not found');
    }

    const farrierProfileId = farrierProfileData.id;

    const horses = [
      {
        name: 'Bella',
        breed: 'Frisone',
        age: 7,
        sex: 'female' as const,
        workType: 'four_shoes' as const,
      },
      {
        name: 'Duke',
        breed: 'Haflinger',
        age: 5,
        sex: 'gelding' as const,
        workType: 'four_shoes' as const,
      },
    ];

    const horseIds: string[] = [];
    let allHorsesCreated = true;

    for (const horseData of horses) {
      const horseResult = await farrierAddHorse({
        farrierProfileId,
        customerProfileId,
        name: horseData.name,
        breed: horseData.breed,
        age: horseData.age,
        sex: horseData.sex,
        workType: horseData.workType,
        isShod: true,
      });

      if (horseResult.success && horseResult.horseId) {
        horseIds.push(horseResult.horseId);
        console.log(`✅ Horse created: ${horseData.name} (${horseResult.horseId})`);
      } else {
        console.log(`❌ Failed to create horse: ${horseData.name}`, horseResult.error);
        allHorsesCreated = false;
        break;
      }
    }

    steps.push({
      stepName: 'Add Horses',
      success: allHorsesCreated && horseIds.length === 2,
      duration: Date.now() - step5Start,
      data: { horseIds },
    });

    if (!allHorsesCreated) {
      throw new Error('Failed to create horses');
    }

    console.log('✅ Horses added:', horseIds);

    // STEP 6: Creare appuntamento
    console.log('📝 Step 6: Creating appointment...');
    const step6Start = Date.now();

    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 5);

    const appointmentResult = await createAppointment({
      farrierProfileId,
      customerProfileId,
      proposedDate: appointmentDate.toISOString(),
      numHorses: 2,
      notes: 'Ferratura completa per entrambi i cavalli',
    });

    steps.push({
      stepName: 'Create Appointment',
      success: appointmentResult.success,
      duration: Date.now() - step6Start,
      error: appointmentResult.error,
      data: { appointmentId: appointmentResult.appointmentId },
    });

    if (!appointmentResult.success) {
      throw new Error(`Appointment creation failed: ${appointmentResult.error}`);
    }

    const appointmentId = appointmentResult.appointmentId!;
    console.log('✅ Appointment created:', appointmentId);

    // STEP 7: Aggiungere cavalli all'appuntamento
    console.log('📝 Step 7: Adding horses to appointment...');
    const step7Start = Date.now();

    const addHorsesResult = await addHorsesToAppointment({
      appointmentId,
      horseIds,
      farrierProfileId,
    });

    steps.push({
      stepName: 'Add Horses to Appointment',
      success: addHorsesResult.success,
      duration: Date.now() - step7Start,
      error: addHorsesResult.error,
      data: addHorsesResult.data,
    });

    if (!addHorsesResult.success) {
      throw new Error(`Adding horses to appointment failed: ${addHorsesResult.error}`);
    }

    console.log('✅ Horses added to appointment');

    // STEP 8: Verifica completa del flusso con query JOIN complessa
    console.log('🔍 Step 8: Verifying complete data structure...');
    const step8Start = Date.now();

    const { data: completeData, error: completeError } = await supabase
      .from('appointments')
      .select(
        `
        id,
        scheduled_at,
        location,
        status,
        customer_profile:profiles!appointments_customer_profile_id_fkey (
          id,
          people (
            first_name,
            last_name
          )
        ),
        farrier_profile:profiles!appointments_farrier_profile_id_fkey (
          id,
          people (
            first_name,
            last_name
          )
        ),
        appointment_horses (
          service_type,
          notes,
          horses (
            id,
            name,
            breed,
            age,
            sex,
            work_type
          )
        )
      `
      )
      .eq('id', appointmentId)
      .maybeSingle();

    console.log(completeError);
    console.log(completeData);
    console.log(completeData.appointment_horses.length === 2);
    
    const hasCompleteStructure =
      !completeError &&
      completeData !== null &&
      completeData.appointment_horses &&
      completeData.appointment_horses.length === 2;

    steps.push({
      stepName: 'Verify Complete Data Structure',
      success: hasCompleteStructure,
      duration: Date.now() - step8Start,
      error: completeError?.message,
      data: completeData,
    });
    // Controlla se l'appuntamento stesso è visibile
const { data: appt, error: apptError } = await supabase
  .from('appointments')
  .select('*')
  .eq('id', appointmentId)
  .maybeSingle();
console.log('appt', appt, apptError);

// Controlla i profili collegati
const { data: customer, error: custError } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', customerProfileId)
  .maybeSingle();
console.log('customer profile', customer, custError);

const { data: farrier, error: farrierError } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', farrierUserId)
  .maybeSingle();
console.log('farrier profile', farrier, farrierError);
    
    if (!hasCompleteStructure) {
      throw new Error('Complete data structure verification failed');
    }

    console.log('✅ Complete data structure verified');

    // STEP 9: Verifica relazione farrier-customer
    console.log('🔍 Step 9: Verifying farrier-customer relationship...');
    const step9Start = Date.now();

    const { data: farrierProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', farrierUserId)
      .maybeSingle();

    const { data: relations, error: relationsError } = await supabase
      .from('farrier_customer_relations')
      .select('*')
      .eq('farrier_profile_id', farrierProfile!.id)
      .eq('client_profile_id', customerProfileId);

    const hasValidRelation =
      !relationsError && relations !== null && relations.length === 1;

    steps.push({
      stepName: 'Verify Farrier-Customer Relationship',
      success: hasValidRelation,
      duration: Date.now() - step9Start,
      error: relationsError?.message,
      data: relations,
    });

    if (!hasValidRelation) {
      throw new Error('Farrier-customer relationship not found');
    }

    console.log('✅ Farrier-customer relationship verified');

    // Test completato con successo
    const totalDuration = Date.now() - startTime;

    return {
      success: true,
      testName: 'End-to-End Farrier-Customer Flow',
      duration: totalDuration,
      steps,
      data: {
        farrierUserId,
        customerProfileId,
        horseIds,
        appointmentId,
        invitationToken,
      },
    };
  } catch (error) {
    return {
      success: false,
      testName: 'End-to-End Farrier-Customer Flow',
      duration: Date.now() - startTime,
      steps,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Cleanup helper per il test E2E completo
 */
export async function cleanupEndToEndTest(data: {
  farrierUserId: string;
  customerProfileId: string;
  horseIds: string[];
  appointmentId: string;
}): Promise<void> {
  console.log('🧹 Cleaning up end-to-end test data...');

  try {
    const { farrierUserId, customerProfileId, horseIds, appointmentId } = data;

    // 1. Elimina appointment_horses
    await supabase.from('appointment_horses').delete().eq('appointment_id', appointmentId);

    // 2. Elimina appointment
    await supabase.from('appointments').delete().eq('id', appointmentId);

    // 3. Elimina horses
    if (horseIds.length > 0) {
      await supabase.from('horses').delete().in('id', horseIds);
    }

    // 4. Elimina invitations
    await supabase
      .from('profile_invitations')
      .delete()
      .eq('profile_id', customerProfileId);

    // 5. Elimina farrier_customer_relations
    await supabase
      .from('farrier_customer_relations')
      .delete()
      .eq('client_profile_id', customerProfileId);

    // 6. Elimina customer profile
    const { data: customerProfile } = await supabase
      .from('profiles')
      .select('person_id')
      .eq('id', customerProfileId)
      .maybeSingle();

    await supabase.from('profiles').delete().eq('id', customerProfileId);

    if (customerProfile?.person_id) {
      await supabase.from('people').delete().eq('id', customerProfile.person_id);
    }

    // 7. Elimina farrier profile
    const { data: farrierProfile } = await supabase
      .from('profiles')
      .select('person_id')
      .eq('user_id', farrierUserId)
      .maybeSingle();

    await supabase.from('profiles').delete().eq('user_id', farrierUserId);

    if (farrierProfile?.person_id) {
      await supabase.from('people').delete().eq('id', farrierProfile.person_id);
    }

    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}
