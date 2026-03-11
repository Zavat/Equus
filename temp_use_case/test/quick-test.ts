/**
 * Quick Test Runner
 *
 * Script veloce per testare rapidamente i flussi principali
 * senza eseguire l'intera suite di test
 */

import { testFarrierAccountCreation } from './test-01-farrier-account-creation';
import { testCustomerSelfRegistration } from './test-02-customer-self-registration';
import { testEndToEndFarrierCustomer } from './test-08-end-to-end-farrier-customer';

/**
 * Test veloce: verifica che i flussi base funzionino
 */
export async function quickTest(): Promise<void> {
  console.log('⚡ Quick Test - Testing core flows...\n');

  const startTime = Date.now();
  let passed = 0;
  let failed = 0;

  // Test 1: Farrier Account
  console.log('1️⃣ Testing Farrier Account Creation...');
  const test1 = await testFarrierAccountCreation();
  if (test1.success) {
    console.log('   ✅ PASSED\n');
    passed++;
  } else {
    console.log(`   ❌ FAILED: ${test1.error}\n`);
    failed++;
  }

  // Test 2: Customer Self Registration
  console.log('2️⃣ Testing Customer Self Registration...');
  const test2 = await testCustomerSelfRegistration();
  if (test2.success) {
    console.log('   ✅ PASSED\n');
    passed++;
  } else {
    console.log(`   ❌ FAILED: ${test2.error}\n`);
    failed++;
  }

  // Test 3: End-to-End Flow
  console.log('3️⃣ Testing End-to-End Flow...');
  const test3 = await testEndToEndFarrierCustomer();
  if (test3.success) {
    console.log('   ✅ PASSED\n');
    passed++;
  } else {
    console.log(`   ❌ FAILED: ${test3.error}\n`);
    failed++;
  }

  const duration = Date.now() - startTime;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚡ Quick Test Results:');
  console.log(`   ✅ Passed: ${passed}/3`);
  console.log(`   ❌ Failed: ${failed}/3`);
  console.log(`   ⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (failed === 0) {
    console.log('🎉 All core flows are working!\n');
  } else {
    console.log('⚠️  Some tests failed. Run individual tests for details.\n');
  }
}

/**
 * Test sanity: verifica solo che il setup funzioni
 */
export async function sanityTest(): Promise<void> {
  console.log('🔍 Sanity Test - Checking basic setup...\n');

  console.log('Testing account creation...');
  const test = await testFarrierAccountCreation();

  if (test.success) {
    console.log('✅ Setup is working correctly!\n');
    console.log('Test details:');
    console.log(`  - User ID: ${test.data?.userId}`);
    console.log(`  - Profile ID: ${test.data?.profileId}`);
    console.log(`  - Duration: ${test.duration}ms`);
    console.log(`  - Steps completed: ${test.steps?.length}\n`);
  } else {
    console.log('❌ Setup test failed!\n');
    console.log(`Error: ${test.error}\n`);
    console.log('Check your database configuration and environment variables.');
  }
}

/**
 * Test specifico per RLS
 */
export async function testRLS(): Promise<void> {
  console.log('🔒 RLS Test - Verifying Row Level Security...\n');

  console.log('Testing customer RLS policies...');
  const test = await testCustomerSelfRegistration();

  if (test.success) {
    const rlsStep = test.steps?.find((s) => s.stepName === 'Test RLS Policies');
    if (rlsStep?.success) {
      console.log('✅ RLS policies are working correctly!\n');
      console.log('Customer can:');
      console.log('  - ✅ See own data');
      console.log('  - ✅ Update own data');
      console.log('  - ❌ See other users data (blocked by RLS)');
    } else {
      console.log('❌ RLS policies failed!\n');
      console.log('Error:', rlsStep?.error);
    }
  } else {
    console.log('❌ Test setup failed:', test.error);
  }
}

/**
 * Test performance: misura i tempi di esecuzione
 */
export async function performanceTest(): Promise<void> {
  console.log('⚡ Performance Test - Measuring execution times...\n');

  const iterations = 3;
  const timings: number[] = [];

  for (let i = 1; i <= iterations; i++) {
    console.log(`Run ${i}/${iterations}...`);
    const start = Date.now();
    const result = await testFarrierAccountCreation();
    const duration = Date.now() - start;

    if (result.success) {
      timings.push(duration);
      console.log(`  ✅ Completed in ${duration}ms`);
    } else {
      console.log(`  ❌ Failed: ${result.error}`);
    }
  }

  if (timings.length > 0) {
    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    const min = Math.min(...timings);
    const max = Math.max(...timings);

    console.log('\n📊 Performance Results:');
    console.log(`  Average: ${avg.toFixed(2)}ms`);
    console.log(`  Min: ${min}ms`);
    console.log(`  Max: ${max}ms`);
    console.log(`  Runs: ${timings.length}/${iterations}\n`);
  }
}

// Export delle funzioni
export const quickTestRunner = {
  quick: quickTest,
  sanity: sanityTest,
  rls: testRLS,
  performance: performanceTest,
};

/**
 * CLI Usage:
 *
 * import { quickTestRunner } from './quick-test';
 *
 * // Test veloce
 * quickTestRunner.quick();
 *
 * // Solo verifica setup
 * quickTestRunner.sanity();
 *
 * // Test RLS
 * quickTestRunner.rls();
 *
 * // Test performance
 * quickTestRunner.performance();
 */

// Esegui il test se questo file viene eseguito direttamente
if (require.main === module) {
  quickTest()
    .then(() => {
      console.log('✅ Quick test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Quick test failed:', error);
      process.exit(1);
    });
}
