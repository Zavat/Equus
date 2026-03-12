import { supabase, retryOperation } from './supabase-test-client';
import { createAccount } from '../01-account-management/uc-01-create-account';
import { completeProfile } from '../01-account-management/uc-02-complete-profile';

/**
 * TEST 01: Creazione Account Farrier Completo
 *
 * Flusso:
 * 1. Farrier si registra con email/password
 * 2. Sistema crea people + profile
 * 3. Farrier completa il profilo con informazioni aggiuntive
 * 4. Verifica che tutto sia stato creato correttamente
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

export async function testFarrierAccountCreation(
  testEmail?: string,
  testPassword?: string
): Promise<TestResult> {
  const startTime = Date.now();
  const steps: StepResult[] = [];

  // Usa email di test univoca se non fornita
  const email = testEmail || `farrier-test-${Date.now()}@example.com`;
  const password = testPassword || 'TestPassword123!';

  try {
    // STEP 1: Creazione account
    console.log('📝 Step 1: Creating farrier account...');
    const step1Start = Date.now();

    const accountResult = await createAccount({
      email,
      password,
      firstName: 'John',
      lastName: 'Farrier',
      role: 'farrier',
    });

    console.log('Account result:', JSON.stringify(accountResult, null, 2));

    steps.push({
      stepName: 'Create Account',
      success: accountResult.success,
      duration: Date.now() - step1Start,
      error: accountResult.error,
      data: accountResult.data,
    });

    if (!accountResult.success) {
      throw new Error(`Account creation failed: ${accountResult.error}`);
    }

    const { userId, profileId, personId } = accountResult.data!;
    console.log('✅ Account created:', { userId, profileId, personId });

    // STEP 2: Verifica dati creati in auth.users
    console.log('🔍 Step 2: Verifying auth.users...');
    const step2Start = Date.now();

    const { data: authUser, error: authError } = await supabase.auth.getUser();

    steps.push({
      stepName: 'Verify Auth User',
      success: !authError && authUser.user?.id === userId,
      duration: Date.now() - step2Start,
      error: authError?.message,
      data: authUser,
    });

    if (authError) {
      throw new Error(`Auth verification failed: ${authError.message}`);
    }

    console.log('✅ Auth user verified');

    // STEP 3: Verifica people
    console.log('🔍 Step 3: Verifying people record...');
    const step3Start = Date.now();

    const { data: person, error: personError } = await supabase
      .from('people')
      .select('*')
      .eq('id', personId)
      .maybeSingle();

    steps.push({
      stepName: 'Verify People Record',
      success: !personError && person !== null,
      duration: Date.now() - step3Start,
      error: personError?.message,
      data: person,
    });

    if (personError || !person) {
      throw new Error('People record not found');
    }

    console.log('✅ People record verified:', person);

    // STEP 4: Verifica profile
    console.log('🔍 Step 4: Verifying profile record...');
    const step4Start = Date.now();

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle();

    steps.push({
      stepName: 'Verify Profile Record',
      success: !profileError && profile !== null && profile.role === 'farrier',
      duration: Date.now() - step4Start,
      error: profileError?.message,
      data: profile,
    });

    if (profileError || !profile) {
      throw new Error('Profile record not found');
    }

    console.log('✅ Profile record verified:', profile);

    // STEP 5: Completare profilo
    console.log('📝 Step 5: Completing farrier profile...');
    const step5Start = Date.now();

    const completeResult = await completeProfile(userId, {
      phone: '+39 123 456 7890',
      address: 'Via Roma 123, Milano',
      businessName: 'John Farrier Services',
      vatNumber: 'IT12345678901',
      preferredLanguage: 'it',
      preferredMapsApp: 'google',
    });

    steps.push({
      stepName: 'Complete Profile',
      success: completeResult.success,
      duration: Date.now() - step5Start,
      error: completeResult.error,
      data: completeResult.profile,
    });

    if (!completeResult.success) {
      throw new Error(`Profile completion failed: ${completeResult.error}`);
    }

    console.log('✅ Profile completed');

    // STEP 6: Verifica profilo completato
    console.log('🔍 Step 6: Verifying completed profile...');
    const step6Start = Date.now();

    const { data: completedProfile, error: completedError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle();

    steps.push({
      stepName: 'Verify Completed Profile',
      success:
        !completedError &&
        completedProfile !== null &&
        completedProfile.phone === '+39 123 456 7890',
      duration: Date.now() - step6Start,
      error: completedError?.message,
      data: completedProfile,
    });

    if (completedError || !completedProfile) {
      throw new Error('Completed profile verification failed');
    }

    console.log('✅ Completed profile verified:', completedProfile);

    // Test completato con successo
    const totalDuration = Date.now() - startTime;

    return {
      success: true,
      testName: 'Farrier Account Creation',
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
      testName: 'Farrier Account Creation',
      duration: Date.now() - startTime,
      steps,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Funzione helper per cleanup dopo il test
 */
export async function cleanupFarrierAccountTest(userId: string): Promise<void> {
  console.log('🧹 Cleaning up test data...');

  // Nota: La cancellazione deve rispettare le foreign key constraints
  // L'ordine è importante: prima le relazioni, poi i dati principali

  try {
    // 1. Elimina appointments (se esistono)
    await supabase.from('appointments').delete().eq('farrier_profile_id', userId);

    // 2. Elimina farrier_customer_relations
    await supabase
      .from('farrier_customer_relations')
      .delete()
      .eq('farrier_profile_id', userId);

    // 3. Elimina profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('person_id')
      .eq('user_id', userId)
      .maybeSingle();

    await supabase.from('profiles').delete().eq('user_id', userId);

    // 4. Elimina person
    if (profile?.person_id) {
      await supabase.from('people').delete().eq('id', profile.person_id);
    }

    // 5. Elimina auth user (richiede admin rights)
    // await supabase.auth.admin.deleteUser(userId);

    // 6. Logout
    await supabase.auth.signOut();

    console.log('✅ Cleanup completed (including logout)');
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}
