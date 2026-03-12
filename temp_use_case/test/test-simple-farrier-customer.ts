import { createClient } from '@supabase/supabase-js';
import { Database } from '../../types/database';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

/**
 * TEST SEMPLICE: Farrier crea account e poi crea un customer
 */
async function testSimpleFarrierCustomer() {
  console.log('\n🧪 TEST SEMPLICE: Farrier crea account e customer\n');

  const farrierEmail = `farrier-${Date.now()}@test.com`;
  const farrierPassword = 'Password123!';

  try {
    // ============================================
    // STEP 1: Creare account FARRIER
    // ============================================
    console.log('📝 Step 1: Creazione account farrier...');

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: farrierEmail,
      password: farrierPassword,
      options: {
        data: {
          first_name: 'Marco',
          last_name: 'Bianchi',
          role: 'farrier',
        },
      },
    });

    if (signUpError) {
      throw new Error(`SignUp failed: ${signUpError.message}`);
    }

    if (!authData.user) {
      throw new Error('No user returned from signUp');
    }

    const userId = authData.user.id;
    console.log('✅ Farrier user created:', userId);

    // Attendere che il trigger crei people e profile
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verificare che profile esista
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      throw new Error('Profile non creato dal trigger');
    }

    console.log('✅ Profile trovato:', profile.id);
    console.log('   Person ID:', profile.person_id);
    console.log('   Role:', profile.role);

    if (!profile.person_id) {
      throw new Error('person_id è null! Il trigger non ha creato people');
    }

    // Aggiornare phone in people
    const { error: personError } = await supabase
      .from('people')
      .update({
        phone: '+39 333 111 2222',
      })
      .eq('id', profile.person_id);

    if (personError) {
      throw new Error(`Update person failed: ${personError.message}`);
    }

    console.log('✅ Person phone aggiornato');

    // Aggiornare profile
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({
        address: 'Via Roma 10, Milano',
        language: 'it',
      })
      .eq('id', profile.id);

    if (updateProfileError) {
      throw new Error(`Update profile failed: ${updateProfileError.message}`);
    }

    console.log('✅ Profile aggiornato');

    // ============================================
    // STEP 2: FARRIER crea un CUSTOMER
    // ============================================
    console.log('\n📝 Step 2: Farrier crea un customer...');

    // Prima creare la person per il customer
    const { data: customerPerson, error: customerPersonError } = await supabase
      .from('people')
      .insert({
        first_name: 'Luigi',
        last_name: 'Verdi',
        email: `customer-${Date.now()}@test.com`,
        phone: '+39 333 999 8888',
      })
      .select()
      .single();

    if (customerPersonError) {
      throw new Error(`Create customer person failed: ${customerPersonError.message}`);
    }

    console.log('✅ Customer person creato:', customerPerson.id);

    // Poi creare il profile del customer
    const { data: customerProfile, error: customerProfileError } = await supabase
      .from('profiles')
      .insert({
        person_id: customerPerson.id,
        role: 'customer',
        source: 'farrier',
        created_by: profile.id, // Il farrier che lo crea
        address: 'Via Napoli 5, Roma',
        language: 'it',
      })
      .select()
      .single();

    if (customerProfileError) {
      throw new Error(`Create customer profile failed: ${customerProfileError.message}`);
    }

    console.log('✅ Customer profile creato:', customerProfile.id);

    // Creare la relazione farrier-customer
    const { data: relation, error: relationError } = await supabase
      .from('farrier_customer_relations')
      .insert({
        farrier_profile_id: profile.id,
        client_profile_id: customerProfile.id,
      })
      .select()
      .single();

    if (relationError) {
      throw new Error(`Create relation failed: ${relationError.message}`);
    }

    console.log('✅ Relazione farrier-customer creata:', relation);

    // ============================================
    // STEP 3: Verificare che il farrier veda il customer
    // ============================================
    console.log('\n📝 Step 3: Verificare che farrier veda il customer...');

    const { data: customers, error: customersError } = await supabase
      .from('farrier_customer_relations')
      .select(`
        *,
        customer:profiles!client_profile_id(
          *,
          person:people(*)
        )
      `)
      .eq('farrier_profile_id', profile.id);

    if (customersError) {
      throw new Error(`Query customers failed: ${customersError.message}`);
    }

    console.log('✅ Farrier vede', customers.length, 'customer(s)');
    console.log('   Customer:', customers[0]?.customer);

    // ============================================
    // RISULTATO FINALE
    // ============================================
    console.log('\n✅ TEST COMPLETATO CON SUCCESSO!\n');
    console.log('Riepilogo:');
    console.log('  - Farrier user_id:', userId);
    console.log('  - Farrier profile_id:', profile.id);
    console.log('  - Customer profile_id:', customerProfile.id);
    console.log('  - Relation ID:', relation.id);

  } catch (error) {
    console.error('\n❌ TEST FALLITO:', error instanceof Error ? error.message : error);
    throw error;
  }
}

// Eseguire il test
testSimpleFarrierCustomer()
  .then(() => {
    console.log('\n✅ Test completato');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Errore:', error);
    process.exit(1);
  });
