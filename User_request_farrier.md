
Analizzo il database per identificare tutte le limitazioni che potrebbero impedire a un proprietario di trovare maniscalchi.


0123456789
 actions taken

Read
supabase/migrations/20251112173002_create_core_schema.sql
Open

Searched
farrier
Open

Read
app/services/request.tsx
Open

Read
app/farrier/propose.tsx
Open

Read
supabase/migrations/20251127112459_simplify_profiles_policies_further.sql
Open
🚨 LIMITAZIONI CRITICHE - Ricerca Farrier
Ho identificato 5 limitazioni principali nel flusso dati che impediscono a un nuovo proprietario di trovare maniscalchi:

1. 🔒 PROBLEMA CRITICO - RLS POLICIES
Location: supabase/migrations/20251127112459_simplify_profiles_policies_further.sql:21-52

Policies attuali sui profiles:

-- ✅ Vedi il tuo profilo
USING (auth.uid() = id)

-- ❌ Farrier vede clienti CON CUI HA GIÀ appuntamenti
USING (id IN (SELECT customer_id FROM appointments WHERE farrier_id = auth.uid()))
Il Problema:
NON ESISTE una policy che permette a owner/stable di vedere i farrier disponibili!

Un proprietario può vedere SOLO:

✅ Il proprio profilo
❌ Nessun farrier (perché non ha appuntamenti esistenti)
È un catch-22: per creare un appuntamento serve vedere i farrier, ma per vedere i farrier servono già appuntamenti.

2. 📍 NESSUN FILTRO GEOGRAFICO
Location: app/services/request.tsx:57-61

Query attuale:

supabase
  .from('profiles')
  .select('id, full_name')
  .eq('role', 'farrier')
  .order('full_name')
Limitazioni:
❌ Nessun filtro per country (potrebbe mostrare farrier dall'estero)
❌ Nessun filtro per distanza geografica (latitude/longitude)
❌ Nessun filtro per city o zona operativa
❌ Mostra farrier che potrebbero essere a 1000km di distanza
Dati necessari ma non controllati:

profiles.country - Deve matchare con il proprietario
profiles.latitude, profiles.longitude - Per calcolare distanza
profiles.city - Per area operativa
3. ⚙️ NESSUN CONTROLLO SETUP FARRIER
Location: Database - price_lists e add_ons tables

Problema:
La query mostra TUTTI i farrier con role='farrier', anche quelli che:

❌ Non hanno completato il profilo
❌ Non hanno creato un listino prezzi (price_lists)
❌ Non hanno aggiunto servizi extra (add_ons)
❌ Non sono pronti ad accettare clienti
Controlli mancanti:

-- Dovrebbe verificare:
EXISTS (SELECT 1 FROM price_lists WHERE farrier_id = profiles.id)
-- E/o flag tipo:
profiles.is_accepting_clients = true
profiles.setup_completed = true
4. 🔍 NESSUNA VISIBILITÀ O DISCOVERY
Location: Database - Nessuna tabella dedicata

Problemi:
❌ Non esiste una tabella farrier_availability o farrier_service_areas
❌ Non c'è modo per farrier di definire:
Zone operative (città/province)
Raggio di servizio (es. 50km)
Giorni/orari disponibili
Nuovi clienti accettati (sì/no)
Struttura mancante:

-- Tabella suggerita (non esiste):
farrier_service_areas
  - farrier_id
  - country
  - region/province
  - max_distance_km
  - accepting_new_clients (boolean)
5. 🔐 POLICY INVERTITA
Location: supabase/migrations/20251127112459_simplify_profiles_policies_further.sql:42-52

Policy attuale:

"Farriers can view customer profiles"
-- Farrier → vede Customer (dopo appuntamento)
Mancante:

"Customers can view available farriers"
-- Customer → vede Farrier (prima dell'appuntamento)
La logica è al contrario! Serve una policy che permette a owner/stable di vedere i farrier pubblicamente disponibili.

📋 RIEPILOGO REQUISITI MANCANTI
#	Requisito	Tabella	Implementato
1	Policy RLS per discovery farrier	profiles	❌ NO
2	Filtro geografico (country)	profiles	❌ NO
3	Filtro distanza (lat/lng)	profiles	❌ NO
4	Check setup completato	price_lists	❌ NO
5	Flag accettazione nuovi clienti	profiles	❌ NO
6	Zone operative farrier	(non esiste)	❌ NO
7	Raggio di servizio	(non esiste)	❌ NO
✅ SOLUZIONE MINIMA IMMEDIATA
Per far funzionare il flusso ora, serve almeno:


-- Aggiungere questa policy:
CREATE POLICY "Anyone can view farriers for discovery"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (role = 'farrier');
Questo permetterebbe a TUTTI gli utenti autenticati di vedere TUTTI i farrier nel sistema.