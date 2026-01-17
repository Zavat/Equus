Flusso Completo dei Dati - App Equus
🔵 FASE 1: REGISTRAZIONE & SETUP

1. Utente si registra
   └─> auth.users (Supabase Auth)
       └─> trigger automatico crea → profiles
           └─> Utente sceglie ruolo: farrier | owner | stable
Se MANISCALCO:

2. Setup listino prezzi
   └─> price_lists (trim: €50, 2 ferri: €80, 4 ferri: €120)
   
3. Setup servizi extra
   └─> add_ons (clip: €5, rasatura: €10, colla: €15)
Se PROPRIETARIO:

2. Aggiunge i suoi cavalli
   └─> horses (Thunder, Bella, Flash)
Se SCUDERIA:

2. Cerca proprietari
   └─> Invia inviti → stable_invitations
       └─> Proprietario accetta
           └─> trigger crea → stable_consents
               └─> Scuderia può vedere/gestire cavalli
🟢 FASE 2: PRENOTAZIONE APPUNTAMENTO

1. Cliente (owner/stable) o Maniscalco crea appuntamento
   └─> appointments (status: 'proposed')
       ├─> farrier_id
       ├─> customer_id
       ├─> proposed_date
       └─> num_horses
   
2. Seleziona cavalli coinvolti
   └─> appointment_horses (per ogni cavallo)
       ├─> horse_id
       ├─> work_type (trim/2_shoes/4_shoes)
       └─> special_notes
🟡 FASE 3: CONFERMA & PIANIFICAZIONE

1. Maniscalco rivede proposta
   └─> appointments.status → 'accepted'
   
2. Cliente conferma data
   └─> appointments.status → 'confirmed'
       └─> confirmed_date viene impostata
   
3. Maniscalco ottimizza il percorso giornaliero
   └─> appointments.sequence_order (1, 2, 3...)
🔴 FASE 4: ESECUZIONE SERVIZIO

1. Giorno dell'appuntamento
   └─> appointments.status → 'in_progress'
   
2. Maniscalco lavora e aggiunge servizi extra
   └─> appointment_modifications (per ogni add-on applicato)
       ├─> appointment_id
       ├─> horse_id
       ├─> add_on_id
       └─> unit_price (congelato)
   
3. Sistema calcola totale
   └─> appointments.total_price = 
       (somma prezzi base da price_lists) + 
       (somma da appointment_modifications)
   
4. Lavoro completato
   └─> appointments.status → 'completed'
💰 FASE 5: PAGAMENTO & FATTURAZIONE

1. Maniscalco crea richiesta pagamento
   └─> payments
       ├─> appointment_id
       ├─> payer_id (customer)
       ├─> amount (totale)
       ├─> payment_method ('pay_now' o 'pay_later')
       └─> status: 'pending'
   
2. Sistema genera fattura
   └─> invoices
       ├─> invoice_number (auto)
       ├─> pdf_url (generato da edge function)
       └─> status: 'issued'
   
3. Cliente paga
   └─> Stripe Payment Intent
       └─> payments.status → 'paid'
           └─> payments.stripe_payment_intent_id
           └─> invoices.status → 'paid'
🔔 FASE CONTINUA: NOTIFICHE
Durante tutto il processo vengono create notifiche:


notifications
├─> Nuovo appuntamento proposto
├─> Appuntamento accettato
├─> Promemoria (24h prima)
├─> Richiesta pagamento
├─> Conferma pagamento
└─> Follow-up (4 settimane dopo)
📊 ESEMPIO PRATICO COMPLETO

👤 Mario (Owner) si registra
   └─> profiles (role: owner)
       └─> Aggiunge cavallo "Thunder"
           └─> horses

👤 Anna (Stable) si registra
   └─> profiles (role: stable)
       └─> Invia invito a Mario per gestire "Thunder"
           └─> stable_invitations (status: pending)
               └─> Mario accetta
                   └─> stable_consents (status: active)

👤 Luca (Farrier) si registra
   └─> profiles (role: farrier)
       ├─> Crea listino → price_lists
       │   ├─ trim: €50
       │   ├─ 2_shoes: €80
       │   └─ 4_shoes: €120
       └─> Crea servizi extra → add_ons
           ├─ clip: €5
           └─ rasatura: €10

📅 Anna prenota appuntamento per Thunder
   └─> appointments (#123, status: proposed)
       └─> appointment_horses
           └─> Thunder, work_type: 4_shoes

✅ Luca accetta → appointments.status = 'accepted'
✅ Anna conferma → appointments.status = 'confirmed'

🔨 Giorno del lavoro
   └─> appointments.status = 'in_progress'
       └─> Luca aggiunge "clip" a Thunder
           └─> appointment_modifications
               └─> add_on_id: clip, unit_price: €5
       └─> Calcolo totale: €120 + €5 = €125
       └─> appointments.total_price = €125
       └─> appointments.status = 'completed'

💶 Pagamento
   └─> payments (amount: €125, status: pending)
       └─> invoices (pdf generato)
           └─> Anna paga con Stripe
               └─> payments.status = 'paid'
               └─> invoices.status = 'paid'

✅ COMPLETATO
Tabelle principali coinvolte in ordine:

profiles ← Registrazione
horses ← Aggiunta cavalli
add_ons + price_lists ← Setup maniscalco
stable_invitations → stable_consents ← Gestione scuderia
appointments ← Prenotazione
appointment_horses ← Cavalli nell'appuntamento
appointment_modifications ← Servizi extra applicati
payments ← Richiesta pagamento
invoices ← Fattura generata
notifications ← Durante tutto il processo