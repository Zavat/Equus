import { testFarrierAccountCreation, cleanupFarrierAccountTest } from './test-01-farrier-account-creation';
import { testCustomerSelfRegistration, cleanupCustomerTest } from './test-02-customer-self-registration';
import { testFarrierCreatesCustomer, cleanupFarrierCustomerTest } from './test-03-farrier-creates-customer';
import { testCustomerClaimsProfile, cleanupClaimTest } from './test-04-customer-claims-profile';
import { testCompleteAppointmentFlow, cleanupAppointmentTest } from './test-05-complete-appointment-flow';
import { testAppointmentWithHorses, cleanupAppointmentWithHorsesTest } from './test-06-appointment-with-horses';
import { testCustomerViewsAppointments } from './test-07-customer-views-appointments';
import { testEndToEndFarrierCustomer, cleanupEndToEndTest } from './test-08-end-to-end-farrier-customer';
import { testHorseVerificationFlow, cleanupHorseVerificationTest } from './test-09-horse-verification-flow';

/**
 * Test Suite Runner
 *
 * Esegue tutti i test in sequenza e mostra un report finale
 */

interface TestSuiteResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
  results: Array<{
    testName: string;
    status: 'PASSED' | 'FAILED';
    duration: number;
    error?: string;
  }>;
}

export async function runAllTests(options?: {
  cleanup?: boolean;
  verbose?: boolean;
}): Promise<TestSuiteResult> {
  const { cleanup = false, verbose = true } = options || {};

  console.log('\n🧪 ================================');
  console.log('🧪 STARTING TEST SUITE');
  console.log('🧪 ================================\n');

  const suiteStartTime = Date.now();
  const results: TestSuiteResult['results'] = [];

  // Test 01: Farrier Account Creation
  if (verbose) console.log('\n📋 Running Test 01: Farrier Account Creation...\n');
  const test01 = await testFarrierAccountCreation();
  results.push({
    testName: test01.testName,
    status: test01.success ? 'PASSED' : 'FAILED',
    duration: test01.duration || 0,
    error: test01.error,
  });
  if (verbose) {
    console.log(
      test01.success
        ? `\n✅ Test 01 PASSED in ${test01.duration}ms`
        : `\n❌ Test 01 FAILED: ${test01.error}`
    );
  }

  // Cleanup Test 01
  if (cleanup && test01.success && test01.data?.userId) {
    await cleanupFarrierAccountTest(test01.data.userId);
  }

  // Delay between tests to avoid connection pool saturation
  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 02: Customer Self Registration
  if (verbose) console.log('\n📋 Running Test 02: Customer Self Registration...\n');
  const test02 = await testCustomerSelfRegistration();
  results.push({
    testName: test02.testName,
    status: test02.success ? 'PASSED' : 'FAILED',
    duration: test02.duration || 0,
    error: test02.error,
  });
  if (verbose) {
    console.log(
      test02.success
        ? `\n✅ Test 02 PASSED in ${test02.duration}ms`
        : `\n❌ Test 02 FAILED: ${test02.error}`
    );
  }

  // Cleanup Test 02
  if (cleanup && test02.success && test02.data?.userId) {
    await cleanupCustomerTest(test02.data.userId);
  }

  // Delay between tests to avoid connection pool saturation
  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 03: Farrier Creates Customer (richiede un farrier esistente)
  // Per questo test, creiamo un farrier temporaneo
  if (verbose) console.log('\n📋 Running Test 03: Farrier Creates Customer...\n');
  const tempFarrier = await testFarrierAccountCreation();
  if (tempFarrier.success && tempFarrier.data?.userId) {
    const test03 = await testFarrierCreatesCustomer(tempFarrier.data.userId);
    results.push({
      testName: test03.testName,
      status: test03.success ? 'PASSED' : 'FAILED',
      duration: test03.duration || 0,
      error: test03.error,
    });
    if (verbose) {
      console.log(
        test03.success
          ? `\n✅ Test 03 PASSED in ${test03.duration}ms`
          : `\n❌ Test 03 FAILED: ${test03.error}`
      );
    }

    // Cleanup Test 03
    if (cleanup && test03.success && test03.data?.customerProfileId && test03.data?.relationId) {
      await cleanupFarrierCustomerTest(test03.data.customerProfileId, test03.data.relationId);
    }

    // Cleanup farrier temporaneo
    if (cleanup) {
      await cleanupFarrierAccountTest(tempFarrier.data.userId);
    }
  } else {
    results.push({
      testName: 'Farrier Creates Customer',
      status: 'FAILED',
      duration: 0,
      error: 'Could not create temporary farrier for test',
    });
    if (verbose) console.log('\n❌ Test 03 FAILED: Could not create temporary farrier');
  }

  // Test 04: Customer Claims Profile
  // Richiede un farrier che crea un cliente e genera invito
  if (verbose) console.log('\n📋 Running Test 04: Customer Claims Profile...\n');
  const tempFarrier2 = await testFarrierAccountCreation();
  if (tempFarrier2.success && tempFarrier2.data?.userId) {
    const tempCustomer = await testFarrierCreatesCustomer(tempFarrier2.data.userId);
    if (tempCustomer.success && tempCustomer.data?.invitationToken && tempCustomer.data?.customerProfileId) {
      const test04 = await testCustomerClaimsProfile(tempCustomer.data.invitationToken);
      results.push({
        testName: test04.testName,
        status: test04.success ? 'PASSED' : 'FAILED',
        duration: test04.duration || 0,
        error: test04.error,
      });
      if (verbose) {
        console.log(
          test04.success
            ? `\n✅ Test 04 PASSED in ${test04.duration}ms`
            : `\n❌ Test 04 FAILED: ${test04.error}`
        );
      }

      // Cleanup Test 04
      if (cleanup && test04.success && test04.data?.userId && test04.data?.profileId) {
        await cleanupClaimTest(test04.data.userId, test04.data.profileId);
      }
    } else {
      results.push({
        testName: 'Customer Claims Profile',
        status: 'FAILED',
        duration: 0,
        error: 'Could not create customer and invitation for test',
      });
      if (verbose) console.log('\n❌ Test 04 FAILED: Could not create customer and invitation');
    }

    // Cleanup farrier temporaneo
    if (cleanup) {
      await cleanupFarrierAccountTest(tempFarrier2.data.userId);
    }
  } else {
    results.push({
      testName: 'Customer Claims Profile',
      status: 'FAILED',
      duration: 0,
      error: 'Could not create temporary farrier for test',
    });
    if (verbose) console.log('\n❌ Test 04 FAILED: Could not create temporary farrier');
  }

  // Test 05: Complete Appointment Flow
  if (verbose) console.log('\n📋 Running Test 05: Complete Appointment Flow...\n');
  const tempFarrier3 = await testFarrierAccountCreation();
  if (tempFarrier3.success && tempFarrier3.data?.userId) {
    const tempCustomer2 = await testFarrierCreatesCustomer(tempFarrier3.data.userId);
    if (tempCustomer2.success && tempCustomer2.data?.customerProfileId) {
      const test05 = await testCompleteAppointmentFlow(
        tempFarrier3.data.userId,
        tempCustomer2.data.customerProfileId
      );
      results.push({
        testName: test05.testName,
        status: test05.success ? 'PASSED' : 'FAILED',
        duration: test05.duration || 0,
        error: test05.error,
      });
      if (verbose) {
        console.log(
          test05.success
            ? `\n✅ Test 05 PASSED in ${test05.duration}ms`
            : `\n❌ Test 05 FAILED: ${test05.error}`
        );
      }

      // Cleanup Test 05
      if (cleanup && test05.success && test05.data?.appointmentId) {
        await cleanupAppointmentTest(test05.data.appointmentId);
      }
    } else {
      results.push({
        testName: 'Complete Appointment Flow',
        status: 'FAILED',
        duration: 0,
        error: 'Could not create customer for test',
      });
      if (verbose) console.log('\n❌ Test 05 FAILED: Could not create customer');
    }

    // Cleanup farrier temporaneo
    if (cleanup) {
      await cleanupFarrierAccountTest(tempFarrier3.data.userId);
    }
  } else {
    results.push({
      testName: 'Complete Appointment Flow',
      status: 'FAILED',
      duration: 0,
      error: 'Could not create temporary farrier for test',
    });
    if (verbose) console.log('\n❌ Test 05 FAILED: Could not create temporary farrier');
  }

  // Test 06: Appointment with Horses
  if (verbose) console.log('\n📋 Running Test 06: Appointment with Horses...\n');
  const tempFarrier4 = await testFarrierAccountCreation();
  if (tempFarrier4.success && tempFarrier4.data?.userId) {
    const tempCustomer3 = await testFarrierCreatesCustomer(tempFarrier4.data.userId);
    if (tempCustomer3.success && tempCustomer3.data?.customerProfileId) {
      const test06 = await testAppointmentWithHorses(
        tempFarrier4.data.userId,
        tempCustomer3.data.customerProfileId
      );
      results.push({
        testName: test06.testName,
        status: test06.success ? 'PASSED' : 'FAILED',
        duration: test06.duration || 0,
        error: test06.error,
      });
      if (verbose) {
        console.log(
          test06.success
            ? `\n✅ Test 06 PASSED in ${test06.duration}ms`
            : `\n❌ Test 06 FAILED: ${test06.error}`
        );
      }

      // Cleanup Test 06
      if (cleanup && test06.success && test06.data?.appointmentId && test06.data?.horseIds) {
        await cleanupAppointmentWithHorsesTest(test06.data.appointmentId, test06.data.horseIds);
      }
    } else {
      results.push({
        testName: 'Appointment with Horses',
        status: 'FAILED',
        duration: 0,
        error: 'Could not create customer for test',
      });
      if (verbose) console.log('\n❌ Test 06 FAILED: Could not create customer');
    }

    // Cleanup farrier temporaneo
    if (cleanup) {
      await cleanupFarrierAccountTest(tempFarrier4.data.userId);
    }
  } else {
    results.push({
      testName: 'Appointment with Horses',
      status: 'FAILED',
      duration: 0,
      error: 'Could not create temporary farrier for test',
    });
    if (verbose) console.log('\n❌ Test 06 FAILED: Could not create temporary farrier');
  }

  // Test 08: End-to-End Farrier Customer
  if (verbose) console.log('\n📋 Running Test 08: End-to-End Farrier Customer...\n');
  const test08 = await testEndToEndFarrierCustomer();
  results.push({
    testName: test08.testName,
    status: test08.success ? 'PASSED' : 'FAILED',
    duration: test08.duration || 0,
    error: test08.error,
  });
  if (verbose) {
    console.log(
      test08.success
        ? `\n✅ Test 08 PASSED in ${test08.duration}ms`
        : `\n❌ Test 08 FAILED: ${test08.error}`
    );
  }

  // Cleanup Test 08
  if (
    cleanup &&
    test08.success &&
    test08.data?.farrierUserId &&
    test08.data?.customerProfileId &&
    test08.data?.horseIds &&
    test08.data?.appointmentId
  ) {
    await cleanupEndToEndTest({
      farrierUserId: test08.data.farrierUserId,
      customerProfileId: test08.data.customerProfileId,
      horseIds: test08.data.horseIds,
      appointmentId: test08.data.appointmentId,
    });
  }

  // Calcola statistiche finali
  const totalDuration = Date.now() - suiteStartTime;
  const passedTests = results.filter((r) => r.status === 'PASSED').length;
  const failedTests = results.filter((r) => r.status === 'FAILED').length;

  // Report finale
  console.log('\n\n🧪 ================================');
  console.log('🧪 TEST SUITE COMPLETED');
  console.log('🧪 ================================\n');

  console.log(`📊 Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)\n`);

  console.log('📋 Detailed Results:\n');
  results.forEach((result, index) => {
    const icon = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} Test ${index + 1}: ${result.testName}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Duration: ${result.duration}ms`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  });

  return {
    totalTests: results.length,
    passedTests,
    failedTests,
    totalDuration,
    results,
  };
}

/**
 * Esegui la test suite se questo file viene eseguito direttamente
 */
if (require.main === module) {
  runAllTests({ cleanup: false, verbose: true })
    .then((result) => {
      if (result.failedTests === 0) {
        console.log('\n🎉 ALL TESTS PASSED! 🎉\n');
        process.exit(0);
      } else {
        console.log('\n⚠️  SOME TESTS FAILED ⚠️\n');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 TEST SUITE ERROR:', error);
      process.exit(1);
    });
}
