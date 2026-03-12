import { supabase } from './supabase-test-client';
import { claimProfile } from '../03-invitations/uc-07-claim-profile';
import { validateInvitationToken } from '../09-security/uc-24-validate-invitation-token';

/**
 * TEST 04: Cliente Reclama Profilo
 *
 * Flusso:
 * 1. Cliente riceve token di invito
 * 2. Cliente si registra/autentica
 * 3. Cliente usa token per reclamare profilo
 * 4. Sistema valida token
 * 5. Sistema collega profile.user_id = auth.users.id
 * 6. Sistema aggiorna invitation.status = 'claimed'
 * 7. Verifica che il cliente abbia accesso ai propri dati
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
    claimedAt?: string;
  };
}

interface StepResult {
  stepName: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

export async function testCustomerClaimsProfile(
  invitationToken: string,
  customerEmail?: string,
  customerPassword?: string
): Promise<TestResult> {
  const startTime = Date.now();
  const steps: StepResult[] = [];

  const email = customerEmail || `claiming-customer-${Date.now()}@example.com`;
  const password = customerPassword || 'TestPassword123!';

  try {
    // STEP 1: Validare token di invito
    console.log('🔍 Step 1: Validating invitation token...');
    const step1Start = Date.now();

    const validationResult = await validateInvitationToken(invitationToken);

    steps.push({
      stepName: 'Validate Invitation Token',
      success: validationResult.success,
      duration: Date.now() - step1Start,
      error: validationResult.error,
      data: validationResult.data,
    });

    if (!validationResult.success) {
      throw new Error(`Token validation failed: ${validationResult.error}`);
    }

    const profileId = validationResult.data!.profileId;
    console.log('✅ Token validated for profile:', profileId);

    // STEP 2: Cliente si registra
    console.log('📝 Step 2: Customer registration...');
    const step2Start = Date.now();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    steps.push({
      stepName: 'Customer Registration',
      success: !authError && authData.user !== null,
      duration: Date.now() - step2Start,
      error: authError?.message,
      data: authData,
    });

    if (authError || !authData.user) {
      throw new Error(`Registration failed: ${authError?.message}`);
    }

    const userId = authData.user.id;
    console.log('✅ Customer registered:', userId);

    // STEP 3: Verifica che il profilo non sia ancora collegato
    console.log('🔍 Step 3: Verifying profile is not yet claimed...');
    const step3Start = Date.now();

    const { data: profileBefore, error: profileBeforeError } = await supabase
      .from('profiles')
      .select('user_id, source')
      .eq('id', profileId)
      .maybeSingle();

    const isNotYetClaimed =
      !profileBeforeError &&
      profileBefore !== null &&
      profileBefore.user_id === null &&
      profileBefore.source === 'farrier';

    steps.push({
      stepName: 'Verify Profile Not Yet Claimed',
      success: isNotYetClaimed,
      duration: Date.now() - step3Start,
      error: profileBeforeError?.message,
      data: profileBefore,
    });

    if (!isNotYetClaimed) {
      throw new Error('Profile already claimed or invalid');
    }

    console.log('✅ Profile not yet claimed');

    // STEP 4: Claim del profilo
    console.log('📝 Step 4: Claiming profile...');
    const step4Start = Date.now();

    const claimResult = await claimProfile(userId, invitationToken);

    steps.push({
      stepName: 'Claim Profile',
      success: claimResult.success,
      duration: Date.now() - step4Start,
      error: claimResult.error,
      data: claimResult.data,
    });

    if (!claimResult.success) {
      throw new Error(`Claim failed: ${claimResult.error}`);
    }

    console.log('✅ Profile claimed');

    // STEP 5: Verifica che il profilo sia ora collegato all'utente
    console.log('🔍 Step 5: Verifying profile is now claimed...');
    const step5Start = Date.now();

    const { data: profileAfter, error: profileAfterError } = await supabase
      .from('profiles')
      .select('user_id, source')
      .eq('id', profileId)
      .maybeSingle();

    const isNowClaimed =
      !profileAfterError &&
      profileAfter !== null &&
      profileAfter.user_id === userId;

    steps.push({
      stepName: 'Verify Profile Is Claimed',
      success: isNowClaimed,
      duration: Date.now() - step5Start,
      error: profileAfterError?.message,
      data: profileAfter,
    });

    if (!isNowClaimed) {
      throw new Error('Profile not properly claimed');
    }

    console.log('✅ Profile now claimed by user');

    // STEP 6: Verifica che l'invito sia marcato come 'claimed'
    console.log('🔍 Step 6: Verifying invitation status...');
    const step6Start = Date.now();

    const { data: invitation, error: invitationError } = await supabase
      .from('profile_invitations')
      .select('status, claimed_at')
      .eq('claim_token', invitationToken)
      .maybeSingle();

    const isInvitationClaimed =
      !invitationError &&
      invitation !== null &&
      invitation.status === 'claimed' &&
      invitation.claimed_at !== null;

    steps.push({
      stepName: 'Verify Invitation Status',
      success: isInvitationClaimed,
      duration: Date.now() - step6Start,
      error: invitationError?.message,
      data: invitation,
    });

    if (!isInvitationClaimed) {
      throw new Error('Invitation not properly marked as claimed');
    }

    console.log('✅ Invitation marked as claimed');

    // STEP 7: Verifica che il cliente possa accedere ai propri dati
    console.log('🔍 Step 7: Testing customer can access own data...');
    const step7Start = Date.now();

    const { data: ownProfile, error: ownProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle();

    const canAccessOwnData = !ownProfileError && ownProfile !== null;

    steps.push({
      stepName: 'Test Customer Access',
      success: canAccessOwnData,
      duration: Date.now() - step7Start,
      error: ownProfileError?.message,
      data: ownProfile,
    });

    if (!canAccessOwnData) {
      throw new Error('Customer cannot access own data');
    }

    console.log('✅ Customer can access own data');

    // STEP 8: Tentativo di claim multiplo (dovrebbe fallire)
    console.log('🔍 Step 8: Testing prevent multiple claims...');
    const step8Start = Date.now();

    const secondClaimResult = await claimProfile(userId, invitationToken);

    const preventedMultipleClaim = !secondClaimResult.success;

    steps.push({
      stepName: 'Prevent Multiple Claims',
      success: preventedMultipleClaim,
      duration: Date.now() - step8Start,
      error: secondClaimResult.error,
      data: secondClaimResult,
    });

    if (!preventedMultipleClaim) {
      throw new Error('Multiple claims not prevented');
    }

    console.log('✅ Multiple claims prevented');

    // Test completato con successo
    const totalDuration = Date.now() - startTime;

    return {
      success: true,
      testName: 'Customer Claims Profile',
      duration: totalDuration,
      steps,
      data: {
        userId,
        profileId,
        claimedAt: invitation?.claimed_at,
      },
    };
  } catch (error) {
    return {
      success: false,
      testName: 'Customer Claims Profile',
      duration: Date.now() - startTime,
      steps,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Cleanup helper
 */
export async function cleanupClaimTest(userId: string, profileId: string): Promise<void> {
  console.log('🧹 Cleaning up claim test data...');

  try {
    // 1. Elimina invitations
    await supabase.from('profile_invitations').delete().eq('profile_id', profileId);

    // 2. Elimina horses
    await supabase.from('horses').delete().eq('owner_profile_id', profileId);

    // 3. Elimina appointments
    await supabase.from('appointments').delete().eq('customer_profile_id', profileId);

    // 4. Elimina relations
    await supabase
      .from('farrier_customer_relations')
      .delete()
      .eq('customer_profile_id', profileId);

    // 5. Elimina profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('person_id')
      .eq('id', profileId)
      .maybeSingle();

    await supabase.from('profiles').delete().eq('id', profileId);

    // 6. Elimina person
    if (profile?.person_id) {
      await supabase.from('people').delete().eq('id', profile.person_id);
    }

    // 7. Logout
    await supabase.auth.signOut();

    console.log('✅ Cleanup completed (including logout)');
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}
