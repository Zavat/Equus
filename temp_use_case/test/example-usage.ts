/**
 * Example Usage - Come Eseguire i Test
 *
 * Questo file mostra esempi pratici di come eseguire i test
 */

import { testFarrierAccountCreation } from './test-01-farrier-account-creation';
import { testCustomerSelfRegistration } from './test-02-customer-self-registration';
import { testEndToEndFarrierCustomer } from './test-08-end-to-end-farrier-customer';
import { runAllTests } from './run-all-tests';

/**
 * ESEMPIO 1: Eseguire un singolo test
 */
export async function example1_SingleTest() {
  console.log('🧪 Example 1: Running a single test\n');

  const result = await testFarrierAccountCreation();

  if (result.success) {
    console.log('✅ Test passed!');
    console.log('Data created:', result.data);
    console.log('Duration:', result.duration, 'ms');
    console.log('\nSteps executed:');
    result.steps?.forEach((step) => {
      console.log(`  ${step.success ? '✅' : '❌'} ${step.stepName} (${step.duration}ms)`);
    });
  } else {
    console.log('❌ Test failed:', result.error);
    console.log('\nFailed at step:');
    const failedStep = result.steps?.find((s) => !s.success);
    if (failedStep) {
      console.log(`  ❌ ${failedStep.stepName}: ${failedStep.error}`);
    }
  }
}

/**
 * ESEMPIO 2: Eseguire test con email personalizzata
 */
export async function example2_CustomEmail() {
  console.log('🧪 Example 2: Running test with custom email\n');

  const customEmail = 'my-custom-farrier@example.com';
  const customPassword = 'MySecurePassword123!';

  const result = await testFarrierAccountCreation(customEmail, customPassword);

  if (result.success) {
    console.log('✅ Test passed with custom email:', customEmail);
    console.log('User ID:', result.data?.userId);
  } else {
    console.log('❌ Test failed:', result.error);
  }
}

/**
 * ESEMPIO 3: Eseguire test end-to-end completo
 */
export async function example3_EndToEnd() {
  console.log('🧪 Example 3: Running complete end-to-end test\n');

  const result = await testEndToEndFarrierCustomer();

  if (result.success) {
    console.log('✅ End-to-end test completed successfully!');
    console.log('\nCreated resources:');
    console.log('  - Farrier User ID:', result.data?.farrierUserId);
    console.log('  - Customer Profile ID:', result.data?.customerProfileId);
    console.log('  - Horses:', result.data?.horseIds?.length, 'created');
    console.log('  - Appointment ID:', result.data?.appointmentId);
    console.log('  - Invitation Token:', result.data?.invitationToken);
    console.log('\nTotal Duration:', result.duration, 'ms');
  } else {
    console.log('❌ End-to-end test failed:', result.error);
  }
}

/**
 * ESEMPIO 4: Eseguire tutti i test
 */
export async function example4_RunAllTests() {
  console.log('🧪 Example 4: Running all tests\n');

  const result = await runAllTests({
    cleanup: false, // Non eliminare i dati dopo i test
    verbose: true, // Mostra output dettagliato
  });

  console.log('\n📊 Test Suite Summary:');
  console.log(`Total: ${result.totalTests}`);
  console.log(`Passed: ${result.passedTests}`);
  console.log(`Failed: ${result.failedTests}`);
  console.log(`Duration: ${result.totalDuration}ms`);
}

/**
 * ESEMPIO 5: Eseguire tutti i test con cleanup
 */
export async function example5_RunAllTestsWithCleanup() {
  console.log('🧪 Example 5: Running all tests with cleanup\n');

  const result = await runAllTests({
    cleanup: true, // Elimina i dati dopo ogni test
    verbose: false, // Output meno verboso
  });

  console.log('Test suite completed!');
  console.log(`${result.passedTests}/${result.totalTests} tests passed`);

  if (result.failedTests > 0) {
    console.log('\nFailed tests:');
    result.results
      .filter((r) => r.status === 'FAILED')
      .forEach((r) => {
        console.log(`  ❌ ${r.testName}: ${r.error}`);
      });
  }
}

/**
 * ESEMPIO 6: Gestione errori e retry
 */
export async function example6_ErrorHandlingAndRetry() {
  console.log('🧪 Example 6: Error handling and retry\n');

  let attempts = 0;
  const maxAttempts = 3;
  let result;

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`Attempt ${attempts}/${maxAttempts}...`);

    result = await testCustomerSelfRegistration();

    if (result.success) {
      console.log('✅ Test passed on attempt', attempts);
      break;
    } else {
      console.log('❌ Test failed:', result.error);
      if (attempts < maxAttempts) {
        console.log('Retrying in 2 seconds...');
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  if (!result?.success) {
    console.log('\n❌ Test failed after', maxAttempts, 'attempts');
  }
}

/**
 * ESEMPIO 7: Eseguire test specifici in sequenza
 */
export async function example7_SequentialTests() {
  console.log('🧪 Example 7: Running specific tests in sequence\n');

  const tests = [
    { name: 'Farrier Account', fn: testFarrierAccountCreation },
    { name: 'Customer Self Registration', fn: testCustomerSelfRegistration },
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\nRunning: ${test.name}...`);
    const result = await test.fn();
    results.push({ name: test.name, ...result });
    console.log(result.success ? '✅ Passed' : `❌ Failed: ${result.error}`);
  }

  console.log('\n📊 Summary:');
  results.forEach((r) => {
    console.log(`${r.success ? '✅' : '❌'} ${r.name} (${r.duration}ms)`);
  });
}

/**
 * ESEMPIO 8: Export dati test per debugging
 */
export async function example8_ExportTestData() {
  console.log('🧪 Example 8: Export test data for debugging\n');

  const result = await testEndToEndFarrierCustomer();

  if (result.success) {
    const testData = {
      timestamp: new Date().toISOString(),
      test: result.testName,
      duration: result.duration,
      data: result.data,
      steps: result.steps?.map((s) => ({
        name: s.stepName,
        success: s.success,
        duration: s.duration,
      })),
    };

    console.log('Test data for debugging:');
    console.log(JSON.stringify(testData, null, 2));

    // Puoi salvare questo JSON in un file per analisi
    // fs.writeFileSync('test-results.json', JSON.stringify(testData, null, 2));
  }
}

/**
 * Come eseguire gli esempi:
 *
 * 1. Importa le funzioni in un file TypeScript:
 *    import { example1_SingleTest } from './example-usage';
 *
 * 2. Esegui la funzione:
 *    example1_SingleTest().then(() => console.log('Done!'));
 *
 * 3. Oppure usa in async context:
 *    async function main() {
 *      await example1_SingleTest();
 *    }
 *    main();
 */

// Esporta tutte le funzioni esempio
export const examples = {
  example1_SingleTest,
  example2_CustomEmail,
  example3_EndToEnd,
  example4_RunAllTests,
  example5_RunAllTestsWithCleanup,
  example6_ErrorHandlingAndRetry,
  example7_SequentialTests,
  example8_ExportTestData,
};
