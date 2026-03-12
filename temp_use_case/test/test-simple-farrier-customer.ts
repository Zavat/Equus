import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
)

async function runFarrierCustomerFlowTest() {

  console.log("\n==============================")
  console.log("E2E FARIER → CUSTOMER FLOW")
  console.log("==============================\n")

  const email = `farrier-${Date.now()}@test.com`
  const password = "Password123!"

  // ---------------------------
  // STEP 1 signup
  // ---------------------------

  console.log("STEP 1 signup farrier")

  const { data: signup, error: signupError } =
    await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: "Marco",
          last_name: "Bianchi",
          role: "farrier"
        }
      }
    })

  if (signupError) throw signupError

  const userId = signup.user?.id
  console.log("user created:", userId)

  // ---------------------------
  // STEP 2 session check
  // ---------------------------

  const session = await supabase.auth.getSession()

  console.log("session:", session.data.session?.user.id)

  if (!session.data.session) {
    throw new Error("NO AUTH SESSION")
  }

  // ---------------------------
  // STEP 3 wait trigger
  // ---------------------------

  console.log("waiting trigger...")

  await new Promise(r => setTimeout(r, 2000))

  // ---------------------------
  // STEP 4 verify profile
  // ---------------------------

  console.log("STEP 4 verify farrier profile")

  const { data: farrierProfile, error: profileError } =
    await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single()

  if (profileError) throw profileError

  console.log("profile:", farrierProfile)

  if (farrierProfile.role !== "farrier")
    throw new Error("role incorrect")

  // ---------------------------
  // STEP 5 update own profile
  // ---------------------------

  console.log("STEP 5 update own profile")

  const { error: updateError } =
    await supabase
      .from("profiles")
      .update({ language: "it" })
      .eq("id", farrierProfile.id)

  if (updateError) throw updateError

  console.log("profile updated")

  // ---------------------------
  // STEP 6 create customer person
  // ---------------------------

  console.log("STEP 6 create customer person")

  const { data: person, error: personError } =
    await supabase
      .from("people")
      .insert({
        first_name: "Luigi",
        last_name: "Verdi",
        email: `customer-${Date.now()}@test.com`
      })
      .select()
      .single()

  if (personError) throw personError

  console.log("person created:", person.id)

  // ---------------------------
  // STEP 7 create customer profile
  // ---------------------------

  console.log("STEP 7 create customer profile")

  const { data: customerProfile, error: customerError } =
    await supabase
      .from("profiles")
      .insert({
        person_id: person.id,
        role: "customer",
        source: "farrier",
        created_by: farrierProfile.id
      })
      .select()
      .single()

  if (customerError) throw customerError

  console.log("customer profile:", customerProfile.id)

  if (customerProfile.user_id !== null)
    throw new Error("customer should not have user")

  // ---------------------------
  // STEP 8 relation
  // ---------------------------

  console.log("STEP 8 create relation")

  const { data: relation, error: relationError } =
    await supabase
      .from("farrier_customer_relations")
      .insert({
        farrier_profile_id: farrierProfile.id,
        client_profile_id: customerProfile.id
      })
      .select()
      .single()

  if (relationError) throw relationError

  console.log("relation created:", relation.id)

  // ---------------------------
  // STEP 9 verify farrier sees customer
  // ---------------------------

  console.log("STEP 9 verify RLS view")

  const { data: customers, error: customersError } =
    await supabase
      .from("farrier_customer_relations")
      .select(`
        *,
        customer:profiles!client_profile_id(
          *,
          person:people(*)
        )
      `)
      .eq("farrier_profile_id", farrierProfile.id)

  if (customersError) throw customersError

  console.log("customers visible:", customers.length)

  if (customers.length !== 1)
    throw new Error("customer not visible")

  console.log("customer data:", customers[0].customer)

  // ---------------------------
  // STEP 10 verify profile visibility
  // ---------------------------

  console.log("STEP 10 verify profile visibility")

  const { data: profiles } =
    await supabase
      .from("profiles")
      .select("id")

  console.log("visible profiles:", profiles?.length)

  console.log("\n==============================")
  console.log("TEST SUCCESS")
  console.log("==============================\n")

}

runFarrierCustomerFlowTest()