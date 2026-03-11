# Test Suite - Use Case Flows

Questa cartella contiene test completi per verificare i flussi principali dell'applicazione.

## Indice Test

### 1. [Flussi Account](#flussi-account)
- `test-01-farrier-account-creation.ts` - Creazione account farrier completo
- `test-02-customer-self-registration.ts` - Cliente si registra autonomamente
- `test-03-farrier-creates-customer.ts` - Farrier crea cliente e invito
- `test-04-customer-claims-profile.ts` - Cliente reclama profilo creato da farrier

### 2. [Flussi Prenotazione](#flussi-prenotazione)
- `test-05-complete-appointment-flow.ts` - Flusso completo: creazione → conferma → completamento
- `test-06-appointment-with-horses.ts` - Appuntamento con gestione cavalli
- `test-07-customer-views-appointments.ts` - Cliente visualizza e gestisce prenotazioni

### 3. [Flussi Integrati](#flussi-integrati)
- `test-08-end-to-end-farrier-customer.ts` - E2E: dalla creazione cliente all'appuntamento
- `test-09-horse-verification-flow.ts` - Flusso verifica cavalli farrier → cliente

## Come Eseguire i Test

### Setup

I test utilizzano il client Supabase reale configurato nel progetto. Prima di eseguire:

1. Assicurati che il database sia configurato con tutte le migrazioni
2. Verifica che le variabili d'ambiente siano corrette (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
3. Usa account di test, non account di produzione

### Opzione 1: Eseguire Tutti i Test

Usa il file `run-all-tests.ts` per eseguire l'intera suite:

```typescript
import { runAllTests } from './test/run-all-tests';

// Esegui tutti i test
runAllTests({ cleanup: false, verbose: true }).then(result => {
  console.log(`${result.passedTests}/${result.totalTests} tests passed`);
});
```

### Opzione 2: Eseguire Test Singoli

Ogni file di test può essere eseguito indipendentemente:

```typescript
import { testFarrierAccountCreation } from './test-01-farrier-account-creation';

// Esegui test
testFarrierAccountCreation().then(result => {
  if (result.success) {
    console.log('✅ Test passed!', result);
  } else {
    console.error('❌ Test failed:', result.error);
  }
});
```

### Opzione 3: Usa gli Esempi Predefiniti

Vedi il file `example-usage.ts` per esempi completi di utilizzo:

```typescript
import { examples } from './test/example-usage';

// Esegui esempio end-to-end
examples.example3_EndToEnd();

// Esegui tutti i test con cleanup
examples.example5_RunAllTestsWithCleanup();
```

### Cleanup

Alcuni test creano dati nel database. Hai due opzioni:

1. **Cleanup Automatico**: Usa `runAllTests({ cleanup: true })` per eliminare automaticamente i dati di test
2. **Cleanup Manuale**: Ogni test ha una funzione `cleanup*` corrispondente:

```typescript
import { testFarrierAccountCreation, cleanupFarrierAccountTest } from './test-01-farrier-account-creation';

const result = await testFarrierAccountCreation();
if (result.success && result.data?.userId) {
  // Pulisci i dati dopo il test
  await cleanupFarrierAccountTest(result.data.userId);
}
```

## Struttura Test

Ogni test segue questa struttura:

```typescript
interface TestResult {
  success: boolean;
  testName: string;
  duration?: number;
  steps?: StepResult[];
  error?: string;
  data?: any;
}

interface StepResult {
  stepName: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}
```

## File Disponibili

### Test Principali

- `test-01-farrier-account-creation.ts` - Test creazione account farrier completo
- `test-02-customer-self-registration.ts` - Test registrazione autonoma cliente
- `test-03-farrier-creates-customer.ts` - Test farrier crea cliente e invito
- `test-04-customer-claims-profile.ts` - Test cliente reclama profilo
- `test-05-complete-appointment-flow.ts` - Test flusso appuntamento completo
- `test-06-appointment-with-horses.ts` - Test appuntamento con gestione cavalli
- `test-07-customer-views-appointments.ts` - Test visualizzazione prenotazioni
- `test-08-end-to-end-farrier-customer.ts` - Test E2E completo
- `test-09-horse-verification-flow.ts` - Test flusso verifica cavalli

### Utilità

- `run-all-tests.ts` - Esegue tutti i test in sequenza con report finale
- `example-usage.ts` - Esempi pratici di utilizzo dei test
- `README.md` - Questa documentazione

## Note Importanti

- I test **creano dati reali** nel database
- Usare **email di test** univoche per evitare conflitti
- I test verificano anche le **RLS policies**
- Alcuni test richiedono **cleanup manuale** dopo l'esecuzione
- Ogni test restituisce un oggetto `TestResult` con dettagli completi
- I test misurano la durata di ogni step per analisi performance
