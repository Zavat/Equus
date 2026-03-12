import { supabase } from '@/lib/supabase';
import { createCustomerProfile } from '../02-customer-creation/uc-03-create-customer-without-account';
import { linkCustomerToFarrier } from '../02-customer-creation/uc-04-link-customer-to-farrier';
import { generateInvitation } from '../03-invitations/uc-05-generate-invitation';

/**
 * TEST 03: Farrier Crea Cliente e Invito
 *
 * Flusso:
 * 1. Farrier autenticato crea un nuovo profilo cliente
 * 2. Sistema crea people + profile con source='farrier' e user_id=NULL
 * 3. Sistema collega farrier e cliente (farrier_customer_relations)
 * 4. Farrier genera invito per il cliente
 * 5. Verifica che il profilo sia corretto e invito generato
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
    relationId?: string;
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

export async function testFarrierCreatesCustomer(
  farrierUserId: string
): Promise<TestResult> {
  const startTime = Date.now();
  const steps: StepResult[] = [];

  try {
    // STEP 1: Ottenere il profile ID del farrier
    console.log('🔍 Step 1: Getting farrier profile...');
    const step1Start = Date.now();

    const { data: farrierProfile, error: farrierError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', farrierUserId)
      .maybeSingle();

    steps.push({
      stepName: 'Get Farrier Profile',
      success: !farrierError && farrierProfile !== null && farrierProfile.role === 'farrier',
      duration: Date.now() - step1Start,
      error: farrierError?.message,
      data: farrierProfile,
    });

    if (farrierError || !farrierProfile || farrierProfile.role !== 'farrier') {
      throw new Error('Farrier profile not found or invalid');
    }

    const farrierProfileId = farrierProfile.id;
    console.log('✅ Farrier profile found:', farrierProfileId);

    // STEP 2: Farrier crea profilo cliente
    console.log('📝 Step 2: Creating customer profile...');
    const step2Start = Date.now();

    const customerResult = await createCustomerProfile(farrierUserId, {
      firstName: 'Luca',
      lastName: 'Bianchi',
      email: `luca.bianchi.${Date.now()}@example.com`,
      phone: '+39 340 123 4567',
      address: 'Via Verdi 78, Firenze',
      notes: 'Cliente con 3 cavalli, appuntamenti mensili',
    });

    steps.push({
      stepName: 'Create Customer Profile',
      success: customerResult.success,
      duration: Date.now() - step2Start,
      error: customerResult.error,
      data: customerResult.data,
    });

    if (!customerResult.success || !customerResult.profileId) {
      throw new Error(`Customer creation failed: ${customerResult.error}`);
    }

    const customerProfileId = customerResult.profileId;
    console.log('✅ Customer profile created:', customerProfileId);

    // STEP 3: Verifica che il profilo cliente abbia source='farrier' e user_id=NULL
    console.log('🔍 Step 3: Verifying customer profile properties...');
    const step3Start = Date.now();

    const { data: customerProfile, error: customerProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', customerProfileId)
      .maybeSingle();

    const isValidCustomerProfile =
      !customerProfileError &&
      customerProfile !== null &&
      customerProfile.role === 'customer' &&
      customerProfile.source === 'farrier' &&
      customerProfile.user_id === null;

    steps.push({
      stepName: 'Verify Customer Profile Properties',
      success: isValidCustomerProfile,
      duration: Date.now() - step3Start,
      error: customerProfileError?.message,
      data: customerProfile,
    });

    if (!isValidCustomerProfile) {
      throw new Error('Customer profile properties invalid');
    }

    console.log('✅ Customer profile properties verified');

    // STEP 4: Collegare cliente al farrier
    console.log('📝 Step 4: Linking customer to farrier...');
    const step4Start = Date.now();

    const linkResult = await linkCustomerToFarrier(farrierUserId, customerProfileId);

    steps.push({
      stepName: 'Link Customer to Farrier',
      success: linkResult.success,
      duration: Date.now() - step4Start,
      error: linkResult.error,
      data: linkResult.data,
    });

    if (!linkResult.success) {
      throw new Error(`Linking failed: ${linkResult.error}`);
    }

    const relationId = linkResult.data!.relationId;
    console.log('✅ Customer linked to farrier:', relationId);

    // STEP 5: Verifica relazione in farrier_customer_relations
    console.log('🔍 Step 5: Verifying farrier-customer relation...');
    const step5Start = Date.now();

    const { data: relation, error: relationError } = await supabase
      .from('farrier_customer_relations')
      .select('*')
      .eq('id', relationId)
      .maybeSingle();

    const isValidRelation =
      !relationError &&
      relation !== null &&
      relation.farrier_profile_id === farrierProfileId &&
      relation.customer_profile_id === customerProfileId;

    steps.push({
      stepName: 'Verify Farrier-Customer Relation',
      success: isValidRelation,
      duration: Date.now() - step5Start,
      error: relationError?.message,
      data: relation,
    });

    if (!isValidRelation) {
      throw new Error('Relation verification failed');
    }

    console.log('✅ Relation verified');

    // STEP 6: Generare invito per il cliente
    console.log('📝 Step 6: Generating invitation...');
    const step6Start = Date.now();

    const invitationResult = await generateInvitation(farrierUserId, customerProfileId);

    steps.push({
      stepName: 'Generate Invitation',
      success: invitationResult.success,
      duration: Date.now() - step6Start,
      error: invitationResult.error,
      data: invitationResult.data,
    });

    if (!invitationResult.success) {
      throw new Error(`Invitation generation failed: ${invitationResult.error}`);
    }

    const invitationToken = invitationResult.data!.token;
    console.log('✅ Invitation generated:', invitationToken);

    // STEP 7: Verifica invito nel database
    console.log('🔍 Step 7: Verifying invitation in database...');
    const step7Start = Date.now();

    const { data: invitation, error: invitationError } = await supabase
      .from('profile_invitations')
      .select('*')
      .eq('claim_token', invitationToken)
      .maybeSingle();

    const isValidInvitation =
      !invitationError &&
      invitation !== null &&
      invitation.profile_id === customerProfileId &&
      invitation.status === 'pending';

    steps.push({
      stepName: 'Verify Invitation',
      success: isValidInvitation,
      duration: Date.now() - step7Start,
      error: invitationError?.message,
      data: invitation,
    });

    if (!isValidInvitation) {
      throw new Error('Invitation verification failed');
    }

    console.log('✅ Invitation verified');

    // Test completato con successo
    const totalDuration = Date.now() - startTime;

    return {
      success: true,
      testName: 'Farrier Creates Customer',
      duration: totalDuration,
      steps,
      data: {
        farrierUserId,
        customerProfileId,
        relationId,
        invitationToken,
      },
    };
  } catch (error) {
    return {
      success: false,
      testName: 'Farrier Creates Customer',
      duration: Date.now() - startTime,
      steps,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Cleanup helper
 */
export async function cleanupFarrierCustomerTest(
  customerProfileId: string,
  relationId: string
): Promise<void> {
  console.log('🧹 Cleaning up farrier-customer test data...');

  try {
    // 1. Elimina invitations
    await supabase
      .from('profile_invitations')
      .delete()
      .eq('profile_id', customerProfileId);

    // 2. Elimina relation
    await supabase.from('farrier_customer_relations').delete().eq('id', relationId);

    // 3. Elimina horses del cliente
    await supabase.from('horses').delete().eq('owner_profile_id', customerProfileId);

    // 4. Elimina profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('person_id')
      .eq('id', customerProfileId)
      .maybeSingle();

    await supabase.from('profiles').delete().eq('id', customerProfileId);

    // 5. Elimina person
    if (profile?.person_id) {
      await supabase.from('people').delete().eq('id', profile.person_id);
    }

    // 6. Logout
    await supabase.auth.signOut();

    console.log('✅ Cleanup completed (including logout)');
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}
