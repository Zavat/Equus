1. add_ons - Servizi Aggiuntivi
Scopo:
Questa tabella contiene i servizi extra che un maniscalco può offrire oltre ai servizi base (pareggio, 2 ferri, 4 ferri).

Struttura:
farrier_id - Il maniscalco che offre questo servizio
code - Codice identificativo del servizio (es: "CLIP", "GLUE")
label - Nome descrittivo (es: "Clip extra", "Incollaggio")
price - Prezzo del servizio aggiuntivo
currency - Valuta (default EUR)
Ruolo nel flusso:
Il maniscalco crea il proprio listino di servizi aggiuntivi
Durante un appuntamento, può applicare questi add-ons a cavalli specifici
Gli add-ons vengono registrati nella tabella appointment_modifications
Contribuiscono al calcolo del prezzo finale dell'appuntamento
Esempio: Un maniscalco ha nel suo listino "Clip extra - €5" e "Rasatura €10". Durante l'appuntamento applica "Clip extra" al cavallo "Thunder".

2. stable_consents - Consensi GDPR per Scuderie
Scopo:
Gestisce i consensi espliciti tra proprietari di cavalli e scuderie. Serve per conformità GDPR quando una scuderia vuole gestire i cavalli di un proprietario.

Struttura:
horse_id - Il cavallo per cui viene dato il consenso
owner_id - Il proprietario che concede il consenso
stable_id - La scuderia che riceve il consenso
status - active o revoked
granted_at / revoked_at - Timestamp per audit trail
Ruolo nel flusso:
Una scuderia invia un invito al proprietario (via stable_invitations)
Il proprietario accetta l'invito
Viene creato automaticamente un record in stable_consents con status active
La scuderia ora può:
Vedere i dati del cavallo
Modificare informazioni del cavallo
Prenotare appuntamenti per quel cavallo
Il proprietario può revocare il consenso in qualsiasi momento
Esempio: La scuderia "Equestrian Center" chiede di gestire il cavallo "Thunder". Il proprietario Mario accetta. Ora la scuderia può vedere Thunder e prenotare il maniscalco per lui.

3. stable_invitations - Sistema di Inviti
Scopo:
Gestisce il processo di invito tra scuderie e proprietari di cavalli. È il primo passo prima che venga creato un consenso.

Struttura:
stable_id - La scuderia che invia l'invito
owner_id - Il proprietario invitato
horse_id - Cavallo specifico (opzionale, può essere NULL per "tutti i cavalli")
status - pending, accepted, declined, expired
message - Messaggio personalizzato dalla scuderia
expires_at - Data di scadenza (default: 7 giorni)
responded_at - Quando il proprietario ha risposto
Ruolo nel flusso:
La scuderia invia un invito al proprietario per gestire uno o più cavalli
L'invito appare nella sezione "Invitations" del proprietario
Il proprietario può:
Accettare → viene creato automaticamente il stable_consent (tramite trigger)
Rifiutare → nessun accesso viene concesso
Ignorare → l'invito scade dopo 7 giorni
Il sistema tiene traccia di chi ha risposto e quando
Esempio: La scuderia "Green Valley" invia un invito a Maria per gestire il suo cavallo "Bella". Maria accetta e automaticamente viene creato il consenso in stable_consents.

4. appointment_modifications - Servizi Extra Applicati
Scopo:
Registra quali add-ons (servizi extra) sono stati applicati a quali cavalli durante un appuntamento specifico.

Struttura:
appointment_id - L'appuntamento di riferimento
horse_id - Il cavallo che riceve il servizio extra
add_on_id - Il servizio extra applicato (riferimento a add_ons)
quantity - Quantità (default: 1)
unit_price - Prezzo unitario al momento dell'applicazione (congelato)
Ruolo nel flusso:
Durante un appuntamento, il maniscalco decide di applicare servizi extra
Per ogni servizio applicato a un cavallo, viene creato un record
Il prezzo viene "congelato" al momento dell'applicazione (se il maniscalco cambia i prezzi dopo, non influisce su appuntamenti passati)
Questi dati vengono usati per:
Calcolare il totale dell'appuntamento
Generare la fattura dettagliata
Mostrare al cliente cosa è stato fatto
Esempio:

Appuntamento #123 con 2 cavalli: "Thunder" e "Bella"
Il maniscalco applica:
"Clip extra" (€5) a Thunder → 1 record in appointment_modifications
"Rasatura" (€10) a Thunder → 1 record in appointment_modifications
"Clip extra" (€5) a Bella → 1 record in appointment_modifications
Totale extra: €20
5. appointment_horses - Cavalli nell'Appuntamento
Scopo:
Tabella di collegamento (join table) che associa i cavalli agli appuntamenti. Permette di avere più cavalli in un singolo appuntamento.

Struttura:
appointment_id - L'appuntamento
horse_id - Il cavallo coinvolto
work_type - Tipo di lavoro per questo cavallo (trim, two_shoes, four_shoes)
weeks_since_last - Settimane dall'ultimo intervento
special_notes - Note specifiche per questo cavallo in questo appuntamento
Ruolo nel flusso:
Quando viene creato un appuntamento, vengono specificati i cavalli coinvolti
Per ogni cavallo, viene creato un record in questa tabella
Ogni cavallo può avere un tipo di lavoro diverso (uno pareggio, uno 4 ferri, ecc.)
Il maniscalco può vedere:
Quanti cavalli deve ferrare
Che tipo di lavoro fare su ciascuno
Note specifiche per ogni cavallo
Serve per calcolare il prezzo base dell'appuntamento
Esempio:

Appuntamento #123 creato dalla scuderia "Green Valley"
Cavalli coinvolti:
"Thunder" → 4 ferri, 6 settimane dall'ultimo, "Sensibile zampa posteriore dx"
"Bella" → 2 ferri, 4 settimane dall'ultimo, "Nessuna nota"
"Flash" → Pareggio, 8 settimane dall'ultimo, "Molto nervoso"
3 record creati in appointment_horses
Flusso Generale dell'Applicazione:

1. SETUP INIZIALE
   ├─ Maniscalco crea price_lists (prezzi base)
   └─ Maniscalco crea add_ons (servizi extra)

2. GESTIONE SCUDERIA-PROPRIETARIO
   ├─ Scuderia invia stable_invitation
   ├─ Proprietario accetta
   └─ Sistema crea stable_consent (automatico)

3. PRENOTAZIONE APPUNTAMENTO
   ├─ Cliente/Scuderia prenota appuntamento
   ├─ Seleziona i cavalli → crea record in appointment_horses
   └─ Maniscalco accetta/propone data

4. ESECUZIONE SERVIZIO
   ├─ Maniscalco aggiunge servizi extra → crea appointment_modifications
   └─ Sistema calcola totale (prezzi base + add-ons)

5. PAGAMENTO
   ├─ Viene creato payment
   ├─ Viene generata fattura (invoice)
   └─ Cliente paga (Stripe)