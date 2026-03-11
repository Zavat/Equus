import { supabase } from '@/lib/supabase';
import { createAccount } from '../01-account-management/uc-01-create-account';
import { completeProfile } from '../01-account-management/uc-02-complete-profile';

/**
 * TEST 02: Cliente si Registra Autonomamente
 *
 * Flusso:
 * 1. Cliente si registra con email/password
 * 2. Sistema crea people + profile con role='customer' e source='user'
 * 3. Cliente completa il profilo
 * 4. Verifica che possa vedere solo i propri dati
 */

interface TestResult {
  success: boolean;
  testName: string;
  duration?: number;
  steps?: StepResult[];
  error?: string;
  data?: {
    userId?: string;
    profileId?: string;
    personId?: string;
  };
}

interface StepResult {
  stepName: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

export async function testCustomerSelfRegistration(
  testEmail?: string,
  testPassword?: string
): Promise<TestResult> {
  const startTime = Date.now();
  const steps: StepResult[] = [];

  const email = testEmail || `customer-test-${Date.now()}@example.com`;
  const password = testPassword || 'TestPassword123!';

  try {
    // STEP 1: Creazione account cliente
    console.log('📝 Step 1: Creating customer account...');
    const step1Start = Date.now();

    const accountResult = await createAccount({
      email,
      password,
      firstName: 'Maria',
      lastName: 'Rossi',
      role: 'customer',
    });

    steps.push({
      stepName: 'Create Customer Account',
      success: accountResult.success,
      duration: Date.now() - step1Start,
      error: accountResult.error,
      data: accountResult.data,
    });

    if (!accountResult.success) {
      throw new Error(`Account creation failed: ${accountResult.error}`);
    }

    const { userId, profileId, personId } = accountResult.data!;
    console.log('✅ Customer account created:', { userId, profileId, personId });

    // STEP 2: Verifica che il profilo sia customer con source='user'
    console.log('🔍 Step 2: Verifying customer profile...');
    const step2Start = Date.now();

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle();

    const isValidCustomerProfile =
      !profileError &&
      profile !== null &&
      profile.role === 'customer' &&
      profile.source === 'user' &&
      profile.user_id === userId;

    steps.push({
      stepName: 'Verify Customer Profile',
      success: isValidCustomerProfile,
      duration: Date.now() - step2Start,
      error: profileError?.message,
      data: profile,
    });

    if (!isValidCustomerProfile) {
      throw new Error('Customer profile validation failed');
    }

    console.log('✅ Customer profile verified:', profile);

    // STEP 3: Completare profilo cliente
    console.log('📝 Step 3: Completing customer profile...');
    const step3Start = Date.now();

    const completeResult = await completeProfile(userId, {
      phone: '+39 333 123 4567',
      address: 'Via Garibaldi 45, Roma',
      preferredLanguage: 'it',
      preferredMapsApp: 'apple',
      useDeviceLanguage: false,
    });

    steps.push({
      stepName: 'Complete Customer Profile',
      success: completeResult.success,
      duration: Date.now() - step3Start,
      error: completeResult.error,
      data: completeResult.profile,
    });

    if (!completeResult.success) {
      throw new Error(`Profile completion failed: ${completeResult.error}`);
    }

    console.log('✅ Customer profile completed');

    // STEP 4: Verifica RLS - cliente può vedere solo i propri dati
    console.log('🔍 Step 4: Testing RLS policies...');
    const step4Start = Date.now();

    // Il cliente dovrebbe vedere solo il proprio profilo
    const { data: ownProfile, error: ownProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Il cliente NON dovrebbe vedere altri profili
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from('profiles')
      .select('id');

    const rlsWorking =
      !ownProfileError &&
      ownProfile !== null &&
      allProfiles !== null &&
      allProfiles.length === 1; // Solo il proprio profilo

    steps.push({
      stepName: 'Test RLS Policies',
      success: rlsWorking,
      duration: Date.now() - step4Start,
      error: ownProfileError?.message || allProfilesError?.message,
      data: {
        ownProfile,
        visibleProfilesCount: allProfiles?.length,
      },
    });

    if (!rlsWorking) {
      throw new Error('RLS policies not working correctly');
    }

    console.log('✅ RLS policies verified - customer can only see own data');

    // STEP 5: Verifica che il cliente possa aggiornare i propri dati
    console.log('📝 Step 5: Testing customer can update own data...');
    const step5Start = Date.now();

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ phone: '+39 333 999 8888' })
      .eq('id', profileId);

    steps.push({
      stepName: 'Test Update Own Data',
      success: !updateError,
      duration: Date.now() - step5Start,
      error: updateError?.message,
    });

    if (updateError) {
      throw new Error(`Update failed: ${updateError.message}`);
    }

    console.log('✅ Customer can update own data');

    // Test completato con successo
    const totalDuration = Date.now() - startTime;

    return {
      success: true,
      testName: 'Customer Self Registration',
      duration: totalDuration,
      steps,
      data: {
        userId,
        profileId,
        personId,
      },
    };
  } catch (error) {
    return {
      success: false,
      testName: 'Customer Self Registration',
      duration: Date.now() - startTime,
      steps,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Cleanup helper
 */
export async function cleanupCustomerTest(userId: string): Promise<void> {
  console.log('🧹 Cleaning up customer test data...');

  try {
    // 1. Elimina horses del cliente
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (profile) {
      await supabase.from('horses').delete().eq('owner_profile_id', profile.id);

      // 2. Elimina appointments
      await supabase
        .from('appointments')
        .delete()
        .eq('customer_profile_id', profile.id);

      // 3. Elimina farrier_customer_relations
      await supabase
        .from('farrier_customer_relations')
        .delete()
        .eq('customer_profile_id', profile.id);
    }

    // 4. Elimina profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('person_id')
      .eq('user_id', userId)
      .maybeSingle();

    await supabase.from('profiles').delete().eq('user_id', userId);

    // 5. Elimina person
    if (profileData?.person_id) {
      await supabase.from('people').delete().eq('id', profileData.person_id);
    }

    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}
