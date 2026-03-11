import { supabase } from '@/lib/supabase';
import { farrierAddHorse } from '../04-horses/uc-08-farrier-add-horse';
import { verifyHorse } from '../04-horses/uc-10-verify-horse';
import { rejectHorse } from '../07-temporary-data/uc-21-reject-horse';
import { showTemporaryData } from '../07-temporary-data/uc-20-show-temporary-data';

/**
 * TEST 09: Flusso Verifica Cavalli Farrier → Cliente
 *
 * Flusso:
 * 1. Farrier aggiunge cavalli per un cliente
 * 2. Cavalli hanno source='farrier' e verified_by_user=false
 * 3. Cliente visualizza cavalli da verificare (temporary data)
 * 4. Cliente verifica alcuni cavalli
 * 5. Cliente rifiuta altri cavalli
 * 6. Verifica che lo stato sia corretto dopo ogni azione
 */

interface TestResult {
  success: boolean;
  testName: string;
  duration?: number;
  steps?: StepResult[];
  error?: string;
  data?: {
    customerUserId?: string;
    verifiedHorseIds?: string[];
    rejectedHorseIds?: string[];
  };
}

interface StepResult {
  stepName: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

export async function testHorseVerificationFlow(
  farrierUserId: string,
  customerUserId: string,
  customerProfileId: string
): Promise<TestResult> {
  const startTime = Date.now();
  const steps: StepResult[] = [];
  const horseIds: string[] = [];

  try {
    // STEP 1: Farrier aggiunge 4 cavalli per il cliente
    console.log('📝 Step 1: Farrier adding horses...');
    const step1Start = Date.now();

    const horses = [
      {
        name: 'Apollo',
        breed: 'Andaluso',
        birthYear: 2016,
        color: 'Grigio',
        microchipNumber: 'IT100200300',
      },
      {
        name: 'Zeus',
        breed: 'Lipizzano',
        birthYear: 2018,
        color: 'Bianco',
        microchipNumber: 'IT400500600',
      },
      {
        name: 'Athena',
        breed: 'Maremmano',
        birthYear: 2019,
        color: 'Baio',
        microchipNumber: 'IT700800900',
      },
      {
        name: 'Hera',
        breed: 'TPR',
        birthYear: 2020,
        color: 'Morello',
        microchipNumber: 'IT111222333',
      },
    ];

    let allHorsesCreated = true;

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
      } else {
        allHorsesCreated = false;
        break;
      }
    }

    steps.push({
      stepName: 'Farrier Add Horses',
      success: allHorsesCreated && horseIds.length === 4,
      duration: Date.now() - step1Start,
      data: { horseIds },
    });

    if (!allHorsesCreated) {
      throw new Error('Failed to create all horses');
    }

    console.log('✅ Farrier added 4 horses:', horseIds);

    // STEP 2: Verifica che tutti i cavalli abbiano source='farrier' e verified_by_user=false
    console.log('🔍 Step 2: Verifying horses are unverified...');
    const step2Start = Date.now();

    const { data: unverifiedHorses, error: unverifiedError } = await supabase
      .from('horses')
      .select('id, name, source, verified_by_user')
      .in('id', horseIds);

    const allUnverified =
      !unverifiedError &&
      unverifiedHorses !== null &&
      unverifiedHorses.length === 4 &&
      unverifiedHorses.every(
        (h) => h.source === 'farrier' && h.verified_by_user === false
      );

    steps.push({
      stepName: 'Verify Horses Are Unverified',
      success: allUnverified,
      duration: Date.now() - step2Start,
      error: unverifiedError?.message,
      data: unverifiedHorses,
    });

    if (!allUnverified) {
      throw new Error('Horses are not properly marked as unverified');
    }

    console.log('✅ All horses unverified');

    // STEP 3: Cliente visualizza dati temporanei
    console.log('📝 Step 3: Customer viewing temporary data...');
    const step3Start = Date.now();

    const temporaryDataResult = await showTemporaryData(customerUserId);

    steps.push({
      stepName: 'Show Temporary Data',
      success: temporaryDataResult.success,
      duration: Date.now() - step3Start,
      error: temporaryDataResult.error,
      data: temporaryDataResult.data,
    });

    if (!temporaryDataResult.success) {
      throw new Error(`Temporary data retrieval failed: ${temporaryDataResult.error}`);
    }

    const temporaryHorses = temporaryDataResult.data!.horses;
    console.log('✅ Customer can see', temporaryHorses.length, 'temporary horses');

    // STEP 4: Verifica che i 4 cavalli siano nei dati temporanei
    console.log('🔍 Step 4: Verifying all horses are in temporary data...');
    const step4Start = Date.now();

    const allInTemporaryData = horseIds.every((id) =>
      temporaryHorses.some((h: any) => h.id === id)
    );

    steps.push({
      stepName: 'Verify All Horses In Temporary Data',
      success: allInTemporaryData,
      duration: Date.now() - step4Start,
      data: { expectedCount: 4, actualCount: temporaryHorses.length },
    });

    if (!allInTemporaryData) {
      throw new Error('Not all horses in temporary data');
    }

    console.log('✅ All horses in temporary data');

    // STEP 5: Cliente verifica i primi 2 cavalli
    console.log('📝 Step 5: Customer verifying first 2 horses...');
    const step5Start = Date.now();

    const horsesToVerify = horseIds.slice(0, 2);
    let allVerified = true;

    for (const horseId of horsesToVerify) {
      const verifyResult = await verifyHorse(customerUserId, horseId);
      if (!verifyResult.success) {
        allVerified = false;
        break;
      }
    }

    steps.push({
      stepName: 'Verify First 2 Horses',
      success: allVerified,
      duration: Date.now() - step5Start,
      data: { verifiedHorseIds: horsesToVerify },
    });

    if (!allVerified) {
      throw new Error('Failed to verify horses');
    }

    console.log('✅ Verified 2 horses:', horsesToVerify);

    // STEP 6: Verifica che i cavalli verificati abbiano verified_by_user=true
    console.log('🔍 Step 6: Checking verified horses status...');
    const step6Start = Date.now();

    const { data: verifiedHorsesCheck, error: verifiedCheckError } = await supabase
      .from('horses')
      .select('id, name, verified_by_user')
      .in('id', horsesToVerify);

    const properlyVerified =
      !verifiedCheckError &&
      verifiedHorsesCheck !== null &&
      verifiedHorsesCheck.every((h) => h.verified_by_user === true);

    steps.push({
      stepName: 'Check Verified Horses Status',
      success: properlyVerified,
      duration: Date.now() - step6Start,
      error: verifiedCheckError?.message,
      data: verifiedHorsesCheck,
    });

    if (!properlyVerified) {
      throw new Error('Horses not properly verified');
    }

    console.log('✅ Verified horses have correct status');

    // STEP 7: Cliente rifiuta il terzo cavallo
    console.log('📝 Step 7: Customer rejecting third horse...');
    const step7Start = Date.now();

    const horseToReject = horseIds[2];
    const rejectResult = await rejectHorse(customerUserId, horseToReject);

    steps.push({
      stepName: 'Reject Third Horse',
      success: rejectResult.success,
      duration: Date.now() - step7Start,
      error: rejectResult.error,
      data: { rejectedHorseId: horseToReject },
    });

    if (!rejectResult.success) {
      throw new Error(`Reject failed: ${rejectResult.error}`);
    }

    console.log('✅ Horse rejected:', horseToReject);

    // STEP 8: Verifica che il cavallo rifiutato sia stato eliminato
    console.log('🔍 Step 8: Verifying rejected horse is deleted...');
    const step8Start = Date.now();

    const { data: rejectedHorse, error: rejectedError } = await supabase
      .from('horses')
      .select('id')
      .eq('id', horseToReject)
      .maybeSingle();

    const isDeleted = !rejectedError && rejectedHorse === null;

    steps.push({
      stepName: 'Verify Rejected Horse Deleted',
      success: isDeleted,
      duration: Date.now() - step8Start,
      error: rejectedError?.message,
      data: { wasDeleted: isDeleted },
    });

    if (!isDeleted) {
      throw new Error('Rejected horse not deleted');
    }

    console.log('✅ Rejected horse deleted');

    // STEP 9: Visualizza di nuovo dati temporanei
    console.log('📝 Step 9: Viewing temporary data again...');
    const step9Start = Date.now();

    const temporaryDataResult2 = await showTemporaryData(customerUserId);

    steps.push({
      stepName: 'Show Temporary Data Again',
      success: temporaryDataResult2.success,
      duration: Date.now() - step9Start,
      error: temporaryDataResult2.error,
      data: temporaryDataResult2.data,
    });

    if (!temporaryDataResult2.success) {
      throw new Error('Temporary data retrieval failed');
    }

    const remainingTemporaryHorses = temporaryDataResult2.data!.horses;

    // Dovrebbe rimanere solo 1 cavallo (il quarto non ancora verificato)
    const correctRemainingCount = remainingTemporaryHorses.length === 1;

    steps.push({
      stepName: 'Verify Remaining Temporary Count',
      success: correctRemainingCount,
      duration: 0,
      data: { remainingCount: remainingTemporaryHorses.length, expected: 1 },
    });

    if (!correctRemainingCount) {
      throw new Error(`Expected 1 remaining temporary horse, got ${remainingTemporaryHorses.length}`);
    }

    console.log('✅ Only 1 unverified horse remains');

    // STEP 10: Verifica conteggio finale
    console.log('🔍 Step 10: Final count verification...');
    const step10Start = Date.now();

    const { data: allCustomerHorses, error: allHorsesError } = await supabase
      .from('horses')
      .select('id, name, verified_by_user')
      .eq('owner_profile_id', customerProfileId);

    // Dovrebbero rimanere 3 cavalli (2 verificati + 1 non verificato)
    const correctFinalCount =
      !allHorsesError &&
      allCustomerHorses !== null &&
      allCustomerHorses.length === 3;

    const twoVerifiedOneNot =
      allCustomerHorses &&
      allCustomerHorses.filter((h) => h.verified_by_user).length === 2 &&
      allCustomerHorses.filter((h) => !h.verified_by_user).length === 1;

    steps.push({
      stepName: 'Final Count Verification',
      success: correctFinalCount && twoVerifiedOneNot,
      duration: Date.now() - step10Start,
      error: allHorsesError?.message,
      data: {
        totalHorses: allCustomerHorses?.length,
        verified: allCustomerHorses?.filter((h) => h.verified_by_user).length,
        unverified: allCustomerHorses?.filter((h) => !h.verified_by_user).length,
      },
    });

    if (!correctFinalCount || !twoVerifiedOneNot) {
      throw new Error('Final count verification failed');
    }

    console.log('✅ Final count correct: 2 verified, 1 unverified, 1 rejected (deleted)');

    // Test completato con successo
    const totalDuration = Date.now() - startTime;

    return {
      success: true,
      testName: 'Horse Verification Flow',
      duration: totalDuration,
      steps,
      data: {
        customerUserId,
        verifiedHorseIds: horsesToVerify,
        rejectedHorseIds: [horseToReject],
      },
    };
  } catch (error) {
    return {
      success: false,
      testName: 'Horse Verification Flow',
      duration: Date.now() - startTime,
      steps,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Cleanup helper
 */
export async function cleanupHorseVerificationTest(
  customerProfileId: string
): Promise<void> {
  console.log('🧹 Cleaning up horse verification test data...');

  try {
    // Elimina tutti i cavalli del cliente
    await supabase.from('horses').delete().eq('owner_profile_id', customerProfileId);

    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}
