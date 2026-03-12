# 🔐 Analisi del Flusso di Autenticazione

## Panoramica

Questo documento analizza in dettaglio come funziona l'autenticazione in Supabase e come viene gestita nei test e negli use case.

---

## 1. Il Client Supabase

### Cos'è il Client Supabase?

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);
```

Il client Supabase è l'interfaccia per comunicare con:
- **PostgreSQL Database** (tramite PostgREST API)
- **Auth Server** (gestione utenti, sessioni, token)
- **Storage** (file upload)
- **Edge Functions** (serverless functions)

### Come Gestisce l'Autenticazione

Il client Supabase mantiene automaticamente:
- **JWT Token** - salvato in memoria/storage
- **Session** - oggetto con user + token + refresh_token
- **Auto-refresh** - rinnova il token prima della scadenza

```typescript
// Quando fai signup/login
await supabase.auth.signUp({ email, password });
// ⬆️ Il client salva automaticamente:
// - access_token (JWT)
// - refresh_token
// - user object

// Tutte le chiamate successive includono automaticamente il JWT
await supabase.from('profiles').select('*');
// ⬆️ Header: Authorization: Bearer <JWT_TOKEN>
```

---

## 2. Flusso di Autenticazione nel Test-08

### Step-by-Step

```typescript
// STEP 1: Farrier Signup
const farrierAccountResult = await createAccount({
  email: 'farrier@example.com',
  password: 'password123',
  role: 'farrier',
});

// Internamente createAccount fa:
// 1. supabase.auth.signUp() -> Crea utente + salva token
// 2. Trigger DB crea automaticamente profile in 'people' e 'profiles'
//
// STATO DOPO STEP 1:
// ✅ Farrier loggato
// ✅ JWT token salvato nel client
// ✅ Tutte le chiamate successive useranno questo token
```

```typescript
// STEP 2: Farrier crea Cliente
const customerResult = await createCustomerProfile(farrierUserId, {
  firstName: 'Giulia',
  lastName: 'Verdi',
});

// Internamente createCustomerProfile fa:
async function createCustomerProfile(farrierUserId, data) {
  // VERIFICA CHI È LOGGATO
  const { data: { user } } = await supabase.auth.getUser();
  // ⬆️ Legge il JWT token salvato -> restituisce il farrier

  if (user.id !== farrierUserId) {
    throw new Error('User ID mismatch');
  }

  // Crea il cliente
  await supabase.from('people').insert({ ... });
  await supabase.from('profiles').insert({
    source: 'farrier',
    created_by: farrier_profile_id,
    user_id: null, // ⬅️ Cliente NON ha account!
  });
}

// STATO DOPO STEP 2:
// ✅ Farrier ancora loggato (nessun logout)
// ✅ Cliente creato ma SENZA account
// ✅ RLS permette al farrier di vedere il cliente
```

```typescript
// STEP 3-7: Altre operazioni
await linkCustomerToFarrier(...);
await generateInvitation(...);
await farrierAddHorse(...);
await createAppointment(...);
await addHorsesToAppointment(...);

// STATO COSTANTE:
// ✅ Farrier sempre loggato
// ✅ Tutte le operazioni fatte dal farrier
// ✅ RLS policies verificano che l'operazione sia permessa
```

### Diagramma del Flusso

```
┌─────────────────────────────────────────────────────────────┐
│ Test-08: End-to-End Farrier-Customer Flow                   │
└─────────────────────────────────────────────────────────────┘

STEP 1: Signup Farrier
┌──────────────┐
│ Test Script  │──① signUp(email, password)──▶ Supabase Auth
└──────────────┘                                      │
                                                      ▼
                                              ┌───────────────┐
                                              │ Creates User  │
                                              │ in auth.users │
                                              └───────────────┘
                                                      │
                                                      ▼
                                              ┌───────────────┐
                                              │ Returns JWT   │
                                              │ Token         │
                                              └───────────────┘
                                                      │
                                                      ▼
┌──────────────┐                               Saves Token
│ Supabase     │◀──────────────────────────────in Client
│ Client       │
│ [FARRIER]    │  ✅ Authenticated as Farrier
└──────────────┘

STEP 2-7: All Operations Use Same Token
┌──────────────┐
│ Test Script  │──② createCustomer()──▶ Supabase Client
│              │                        [FARRIER TOKEN]
│              │                              │
│              │                              ▼
│              │                        PostgreSQL DB
│              │                        + RLS Policies
│              │                              │
│              │                              ▼
│              │                        ┌──────────────┐
│              │◀───────────────────────│ Checks:      │
│              │                        │ auth.uid() = │
│              │                        │ farrier_id   │
│              │                        └──────────────┘
└──────────────┘

NO LOGOUT AT ANY POINT! ⚠️
```

---

## 3. Row Level Security (RLS) e Autenticazione

### Come RLS Usa il JWT Token

Ogni query al database include automaticamente il JWT token nell'header:

```http
GET /rest/v1/profiles
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

PostgreSQL decodifica il token e rende disponibili:
- `auth.uid()` - ID dell'utente autenticato
- `auth.jwt()` - Intero oggetto JWT con metadata

### Esempio di RLS Policy

```sql
-- Policy: Farrier can view their customers
CREATE POLICY "Farriers can view their customers"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM farrier_customer_relations fcr
      INNER JOIN profiles farrier_prof ON fcr.farrier_profile_id = farrier_prof.id
      WHERE fcr.client_profile_id = profiles.id
      AND farrier_prof.user_id = auth.uid()  -- ⬅️ Usa il JWT token!
    )
  );
```

Quando il farrier fa:
```typescript
await supabase.from('profiles').select('*');
```

PostgreSQL:
1. ✅ Decodifica JWT token
2. ✅ Estrae `auth.uid()` = farrier user ID
3. ✅ Applica RLS policy
4. ✅ Restituisce solo i profili che il farrier può vedere

---

## 4. Use Case (UC) - Precondizioni Implicite

### Struttura di un Use Case

```typescript
export async function someUseCase(input: Input): Promise<Result> {
  // PRECONDIZIONE IMPLICITA #1: Autenticazione
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // PRECONDIZIONE IMPLICITA #2: Permessi
  // Se l'operazione non è permessa, RLS bloccherà la query

  // PRECONDIZIONE IMPLICITA #3: Dati validi
  // Assume che l'input sia valido e consistente

  // Esegue operazione
  const { data, error } = await supabase
    .from('table')
    .insert(input);

  return { success: !error, data, error };
}
```

### Precondizioni NON Verificate

Gli use case **NON** verificano:
- ❌ Se l'utente ha il ruolo corretto (customer vs farrier)
- ❌ Se i dati di input esistono nel database
- ❌ Se ci sono conflitti (es. email duplicata)

Perché? **Perché si fidano di RLS per bloccare operazioni non permesse.**

### Esempio: uc-03-create-customer-without-account

```typescript
export async function createCustomerWithoutAccount(input) {
  // ASSUME: Il chiamante è un farrier loggato
  const { data: { user } } = await supabase.auth.getUser();

  // ASSUME: input.farrierUserId corrisponde all'utente loggato
  if (user.id !== input.farrierUserId) {
    return { success: false, error: 'User ID mismatch' };
  }

  // ASSUME: RLS permetterà l'insert
  const { data: personData } = await supabase
    .from('people')
    .insert({ ... });

  // ASSUME: RLS permetterà l'insert con source='farrier'
  const { data: profileData } = await supabase
    .from('profiles')
    .insert({
      source: 'farrier',
      created_by: farrier_profile_id,
    });
}
```

**Se un customer provasse a chiamare questo UC:**
```typescript
// Customer loggato
const { user } = await supabase.auth.getUser(); // user = customer

// Prova a creare un cliente
await createCustomerWithoutAccount({
  farrierUserId: user.id, // ⬅️ Ma user è un customer!
  firstName: 'Test',
});

// Risultato:
// 1. getUser() passa (customer è loggato)
// 2. user.id check passa (user.id === input.farrierUserId)
// 3. Insert in 'people' passa (RLS lo permette)
// 4. Insert in 'profiles' con source='farrier' FALLISCE
//    Perché RLS richiede che created_by sia un farrier profile
```

---

## 5. Cleanup con Logout

### ✅ RISOLTO: Logout nei Test

Tutti i test ora includono `await supabase.auth.signOut()` nel cleanup:

```typescript
export async function cleanupTest(data: any): Promise<void> {
  try {
    // 1. Elimina dati dal database
    await supabase.from('appointments').delete()...

    // 2. Elimina profili
    await supabase.from('profiles').delete()...

    // 3. LOGOUT
    await supabase.auth.signOut();

    console.log('✅ Cleanup completed (including logout)');
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}
```

**Benefici:**
- ✅ Ogni test riparte con stato di autenticazione pulito
- ✅ Nessuna interferenza tra test successivi
- ✅ Simula meglio il comportamento reale (logout esplicito)

### 🚨 Problema: Test Multi-Utente Mancanti

I test attuali non fanno mai cambio di utente:
```typescript
// Login come farrier
await supabase.auth.signInWithPassword({ email: farrier, password });

// Logout
await supabase.auth.signOut();

// Login come customer
await supabase.auth.signInWithPassword({ email: customer, password });
```

**Impatto:**
- ❌ Non testiamo mai le operazioni dal punto di vista del customer
- ❌ Non verifichiamo che i customer NON possano fare operazioni farrier
- ❌ Non testiamo completamente il flow "customer claims profile"

### 🚨 Problema: Test Isolati, Non Integrati

Ogni test crea nuovi dati:
```typescript
test-01: Crea farrier A
test-02: Crea customer B (non collegato a farrier A)
test-03: Crea farrier C + customer D
```

**Impatto:**
- ❌ Non testiamo interazioni tra utenti diversi
- ❌ Non verifichiamo che farrier A NON veda customer D
- ❌ Non testiamo scenari multi-tenancy

### 🚨 Problema: Customer Senza Account Mai Testato

I customer creati dai farrier hanno `user_id = null`:
```sql
INSERT INTO profiles (user_id, source, created_by)
VALUES (NULL, 'farrier', <farrier_profile_id>);
```

**Come dovrebbe funzionare:**
1. Farrier crea customer (user_id = NULL)
2. Farrier genera invitation token
3. Customer riceve email con token
4. Customer clicca link + crea account
5. Sistema collega account → profile esistente (claim)

**Cosa manca:**
- ❌ Test del claim flow
- ❌ Test che il customer possa loggarsi dopo claim
- ❌ Test che il customer veda i suoi dati dopo claim

---

## 6. Come Funziona nella Realtà (App Production)

### Flow Completo: Farrier → Customer

```typescript
// 1. FARRIER: Crea cliente senza account
// Context: Farrier loggato nell'app
async function handleCreateCustomer() {
  const { user } = await supabase.auth.getUser();
  // user = farrier

  await createCustomerWithoutAccount({
    farrierUserId: user.id,
    firstName: 'Mario',
    lastName: 'Rossi',
    email: 'mario@example.com',
  });

  // Genera invitation
  const { token } = await generateInvitation(
    user.id,
    customerProfileId
  );

  // Invia email al customer
  await sendEmail({
    to: 'mario@example.com',
    subject: 'Invito app Farrier',
    link: `https://app.farrier.com/claim?token=${token}`,
  });
}

// 2. CUSTOMER: Riceve email, clicca link
// Browser apre: https://app.farrier.com/claim?token=abc123

// 3. CUSTOMER: Crea account
async function handleClaimProfile(token: string) {
  // Verifica token
  const { data: invitation } = await supabase
    .from('profile_invitations')
    .select('profile_id')
    .eq('token', token)
    .maybeSingle();

  if (!invitation) {
    throw new Error('Invalid token');
  }

  // Customer crea account
  const { data: authData } = await supabase.auth.signUp({
    email: 'mario@example.com',
    password: 'password123',
  });

  // ⬆️ Ora customer è loggato!
  // Il trigger DB crea automaticamente profile con source='user'
  // Ma noi vogliamo collegare al profile esistente!

  // Claim: Collega account → profile esistente
  await supabase
    .from('profiles')
    .update({
      user_id: authData.user.id,
      claimed_at: new Date(),
      source: 'user', // Aggiorna source
    })
    .eq('id', invitation.profile_id);

  // Marca invito come usato
  await supabase
    .from('profile_invitations')
    .update({ claimed_at: new Date() })
    .eq('token', token);
}

// 4. CUSTOMER: Ora è loggato e può vedere i suoi dati
async function loadCustomerData() {
  const { user } = await supabase.auth.getUser();
  // user = customer (Mario Rossi)

  // Vede il suo profilo
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  // Vede i suoi cavalli
  const { data: horses } = await supabase
    .from('horses')
    .select('*')
    .eq('owner_profile_id', profile.id);

  // Vede i suoi appuntamenti
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('client_profile_id', profile.id);
}
```

### Context Switch nell'App

```typescript
// React Context per gestire auth state
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // Ascolta cambiamenti auth
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);

        // Carica profilo dell'utente loggato
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        setProfile(data);
      } else {
        setUser(null);
        setProfile(null);
      }
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile }}>
      {children}
    </AuthContext.Provider>
  );
}

// In un componente
function CustomerDashboard() {
  const { user, profile } = useAuth();

  if (!user) {
    return <LoginScreen />;
  }

  if (profile?.role === 'customer') {
    return <CustomerView />;
  }

  if (profile?.role === 'farrier') {
    return <FarrierView />;
  }
}
```

---

## 7. Best Practices

### ✅ DO: Verifica sempre l'autenticazione

```typescript
async function sensitiveOperation() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Procedi con operazione
}
```

### ✅ DO: Fidati di RLS per i permessi

```typescript
// NON fare questo:
async function getCustomers(farrierUserId: string) {
  const { user } = await supabase.auth.getUser();

  // ❌ NON implementare logica permessi qui
  if (user.role !== 'farrier') {
    throw new Error('Not authorized');
  }

  // ❌ NON filtrare manualmente
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('created_by', farrierUserId);
}

// FARE questo invece:
async function getCustomers() {
  // ✅ Lascia che RLS gestisca i permessi
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'customer');

  // RLS restituirà automaticamente solo i customer
  // che l'utente loggato può vedere
}
```

### ✅ DO: Gestisci logout esplicito

```typescript
async function logout() {
  await supabase.auth.signOut();
  // Pulisci state locale
  // Redirect a login screen
}
```

### ❌ DON'T: Assumere che l'utente sia sempre loggato

```typescript
// ❌ BAD
async function badFunction() {
  const { user } = await supabase.auth.getUser();
  // Continua senza verificare user
  const name = user.email; // ⬅️ Può crashare se user è null!
}

// ✅ GOOD
async function goodFunction() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  const name = user.email;
}
```

---

## 8. Testing Strategy Recommendation

### Test da Aggiungere

```typescript
// test-multi-user.ts
describe('Multi-User Scenarios', () => {
  test('Farrier cannot see other farrier customers', async () => {
    // Create farrier A
    await supabase.auth.signUp(farrierA);
    const customerA = await createCustomer();
    await supabase.auth.signOut();

    // Create farrier B
    await supabase.auth.signUp(farrierB);

    // Try to access farrier A's customer
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', customerA.id)
      .maybeSingle();

    expect(data).toBeNull(); // RLS should block
  });

  test('Customer can claim profile', async () => {
    // Farrier creates customer + invitation
    await supabase.auth.signUp(farrier);
    const customer = await createCustomer();
    const { token } = await generateInvitation(customer.id);
    await supabase.auth.signOut();

    // Customer claims
    const claimed = await claimProfile(token, {
      email: customer.email,
      password: 'password123',
    });

    expect(claimed.success).toBe(true);

    // Verify customer can now login
    const { data } = await supabase.auth.signInWithPassword({
      email: customer.email,
      password: 'password123',
    });

    expect(data.user).toBeDefined();
  });
});
```

---

## 9. Conclusioni

### Riepilogo

1. **Supabase Client** = interfaccia per DB + Auth + Storage
2. **JWT Token** = salvato automaticamente dopo signup/login
3. **`auth.getUser()`** = legge token salvato, restituisce utente loggato
4. **RLS Policies** = usano `auth.uid()` dal JWT per filtrare dati
5. **Use Cases** = assumono precondizioni (auth, permessi, dati validi)
6. **Test attuali** = testano solo flusso farrier, senza cambio utente
7. **Mancano** = test multi-user, test claim, test customer view

### Next Steps

- [x] Aggiungere `signOut()` in tutti i cleanup dei test
- [ ] Aggiungere test con cambio utente (farrier → customer)
- [ ] Implementare `uc-07-claim-profile.ts` completo
- [ ] Aggiungere test customer view (dopo claim)
- [ ] Test RLS: verificare che farrier A NON veda dati farrier B
- [ ] Test edge cases: token scaduto, doppio claim, etc.
