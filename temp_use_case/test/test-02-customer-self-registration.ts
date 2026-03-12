import { supabase, waitForTrigger, retryOperation } from './supabase-test-client'
import { createAccount } from '../01-account-management/uc-01-create-account'
import { completeProfile } from '../01-account-management/uc-02-complete-profile'

interface TestResult {
  success: boolean;
  testName: string;
  duration?: number;
  error?: string;
  data?: {
    userId?: string;
    profileId?: string;
  };
}

export async function testCustomerSelfRegistration(): Promise<TestResult> {
  const startTime = Date.now();
  const email = `customer-test-${Date.now()}@example.com`
  const password = 'TestPassword123!'

  console.log("TEST EMAIL:", email)

  try {

    // STEP 1 — Create account
    console.log("STEP 1: create account")

    const account = await createAccount({
      email,
      password,
      firstName: "Maria",
      lastName: "Rossi",
      role: "customer"
    })

    if (!account.success) {
      throw new Error(account.error)
    }

    const { userId, profileId } = account.data!

    console.log("ACCOUNT CREATED:", account.data)


    // STEP 2 — LOGIN (fondamentale)
    console.log("STEP 2: explicit login")

    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (loginError || !loginData.session) {
      throw new Error(`Login failed: ${loginError?.message}`)
    }

    console.log("LOGIN SUCCESS:", loginData.user.id)


    // STEP 3 — check session
    const session = await supabase.auth.getSession()

    console.log("SESSION:", session.data.session?.user.id)

    if (!session.data.session) {
      throw new Error("User not authenticated")
    }


    // STEP 4 — complete profile
    console.log("STEP 4: complete profile")

    const complete = await completeProfile(userId, {
      phone: "+39 333 123 4567",
      address: "Via Garibaldi 45",
      city: "Roma",
      country: "IT",
      preferredLanguage: "it",
      preferredMapsApp: "apple"
    })

    if (!complete.success) {
      throw new Error(complete.error)
    }


    // STEP 5 — verify profile (with retry for network resilience)
    console.log("STEP 5: verify profile")

    const profile = await retryOperation(async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single()

      if (error) throw error
      if (!data) throw new Error("Profile not found")

      return data
    })

    console.log("PROFILE:", profile)


    // STEP 6 — test update (with retry)
    console.log("STEP 6: update profile")

    const updatedProfile = await retryOperation(async () => {
      const { data, error } = await supabase
        .from("profiles")
        .update({ language: "fr" })
        .eq("id", profileId)
        .select()
        .single()

      if (error) throw error
      if (!data) throw new Error("Update failed")

      return data
    })

    console.log("UPDATED PROFILE:", updatedProfile)


    // STEP 7 — test RLS (with retry)
    console.log("STEP 7: test RLS")

    const visibleProfiles = await retryOperation(async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")

      if (error) throw error
      return data || []
    })

    console.log("VISIBLE PROFILES:", visibleProfiles.length)

    // Cleanup: Logout and wait for completion
    console.log("STEP 8: cleanup")
    await supabase.auth.signOut()
    await new Promise(resolve => setTimeout(resolve, 200))
    console.log("✅ Logged out")

    const duration = Date.now() - startTime;

    return {
      success: true,
      testName: 'Customer Self Registration',
      duration,
      data: {
        userId,
        profileId
      }
    }

  } catch (error) {

    console.error("TEST FAILED:", error)

    // Cleanup on error: Logout and wait
    try {
      await supabase.auth.signOut()
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (cleanupError) {
      console.error("Cleanup error:", cleanupError)
    }

    const duration = Date.now() - startTime;

    return {
      success: false,
      testName: 'Customer Self Registration',
      duration,
      error: error instanceof Error ? error.message : "unknown"
    }

  }
}

/**
 * Cleanup function per Test 02
 */
export async function cleanupCustomerTest(userId: string): Promise<void> {
  console.log(`\n🧹 Cleaning up test customer: ${userId}`);

  try {
    // Note: In production, you might want to delete the user
    // For now, we just logout to free up connections
    await supabase.auth.signOut();
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}