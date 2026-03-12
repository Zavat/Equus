import { supabase } from '@/lib/supabase'
import { createAccount } from '../01-account-management/uc-01-create-account'
import { completeProfile } from '../01-account-management/uc-02-complete-profile'

export async function testCustomerSelfRegistration() {

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
    console.log("STEP 2: login")




    // STEP 3 — check session
    const session = await supabase.auth.getSession()

    console.log("SESSION:", session.data.session?.user.id)

    if (!session.data.session) {
      throw new Error("User not authenticated")
    }


    // STEP 4 — complete profile
    console.log("STEP 3: complete profile")

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


    // STEP 5 — verify profile
    console.log("STEP 4: verify profile")

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .single()

    if (profileError) {
      throw profileError
    }

    console.log("PROFILE:", profile)


    // STEP 6 — test update
    console.log("STEP 5: update profile")

    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({ language: "fr" })
      .eq("id", profileId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    console.log("UPDATED PROFILE:", updatedProfile)


    // STEP 7 — test RLS
    console.log("STEP 6: test RLS")

    const { data: visibleProfiles, error: rlsError } = await supabase
      .from("profiles")
      .select("id")

    if (rlsError) {
      throw rlsError
    }

    console.log("VISIBLE PROFILES:", visibleProfiles.length)

    // Cleanup: Logout
    await supabase.auth.signOut()
    console.log("✅ Logged out")

    return {
      success: true,
      userId,
      profileId
    }

  } catch (error) {

    console.error("TEST FAILED:", error)

    // Cleanup on error: Logout
    await supabase.auth.signOut()

    return {
      success: false,
      error: error instanceof Error ? error.message : "unknown"
    }

  }
}

export async function cleanupCustomerTest(userId: string): Promise<void> {
  console.log(`\n🧹 Cleaning up test customer: ${userId}`);

  try {
    await supabase.auth.signOut();
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}
