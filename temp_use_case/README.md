# Documentazione Use Case - Sistema Farrier

## Indice per Macro Temi

### 1. [Gestione Account](#1-gestione-account)
- [UC-01: Creare account utente](#uc-01-creare-account-utente)
- [UC-02: Completare profilo utente](#uc-02-completare-profilo-utente)

### 2. [Creazione Cliente da Farrier](#2-creazione-cliente-da-farrier)
- [UC-03: Creare cliente senza account](#uc-03-creare-cliente-senza-account)
- [UC-04: Collegare cliente al farrier](#uc-04-collegare-cliente-al-farrier)

### 3. [Invito e Claim Account](#3-invito-e-claim-account)
- [UC-05: Generare invito cliente](#uc-05-generare-invito-cliente)
- [UC-06: Inviare invito cliente](#uc-06-inviare-invito-cliente)
- [UC-07: Claim del profilo](#uc-07-claim-del-profilo)

### 4. [Gestione Cavalli](#4-gestione-cavalli)
- [UC-08: Farrier aggiunge cavallo](#uc-08-farrier-aggiunge-cavallo)
- [UC-09: Cliente aggiunge cavallo](#uc-09-cliente-aggiunge-cavallo)
- [UC-10: Cliente conferma cavallo](#uc-10-cliente-conferma-cavallo)
- [UC-11: Cliente modifica cavallo](#uc-11-cliente-modifica-cavallo)
- [UC-12: Farrier visualizza cavalli cliente](#uc-12-farrier-visualizza-cavalli-cliente)

### 5. [Prenotazioni](#5-prenotazioni)
- [UC-13: Farrier crea prenotazione](#uc-13-farrier-crea-prenotazione)
- [UC-14: Aggiungere cavalli alla prenotazione](#uc-14-aggiungere-cavalli-alla-prenotazione)
- [UC-15: Cliente visualizza prenotazioni](#uc-15-cliente-visualizza-prenotazioni)
- [UC-16: Confermare prenotazione](#uc-16-confermare-prenotazione)
- [UC-17: Completare prenotazione](#uc-17-completare-prenotazione)

### 6. [Gestione Relazioni](#6-gestione-relazioni)
- [UC-18: Farrier vede lista clienti](#uc-18-farrier-vede-lista-clienti)
- [UC-19: Cliente vede i propri farrier](#uc-19-cliente-vede-i-propri-farrier)

### 7. [Dati Temporanei](#7-dati-temporanei)
- [UC-20: Mostrare dati temporanei all'utente](#uc-20-mostrare-dati-temporanei-allutente)
- [UC-21: Cliente rifiuta cavallo](#uc-21-cliente-rifiuta-cavallo)

### 8. [Amministrazione](#8-amministrazione)
- [UC-22: Farrier aggiorna cliente](#uc-22-farrier-aggiorna-cliente)
- [UC-23: Cliente aggiorna i propri dati](#uc-23-cliente-aggiorna-i-propri-dati)

### 9. [Sicurezza](#9-sicurezza)
- [UC-24: Validare token invito](#uc-24-validare-token-invito)
- [UC-25: Impedire claim multiplo](#uc-25-impedire-claim-multiplo)

### 10. [Sistema](#10-sistema)
- [UC-26: Generare token](#uc-26-generare-token)
- [UC-27: Scadenza inviti](#uc-27-scadenza-inviti)

---

## 1. Gestione Account

### UC-01: Creare account utente

**Attore**: Cliente

**Descrizione**: Processo di registrazione iniziale di un utente nel sistema.

**Precondizioni**:
- Utente non registrato
- Email valida disponibile

**Flusso**:
1. L'utente fornisce email e password
2. Sistema crea record in `auth.users` tramite Supabase
3. Sistema crea record in `people`
4. Sistema crea record in `profiles` collegato a `auth.users.id`

**Postcondizioni**:
- `profiles.user_id = auth.users.id`
- Utente autenticato

**File**: `uc-01-create-account.ts`

---

### UC-02: Completare profilo utente

**Attore**: Cliente

**Descrizione**: L'utente completa le informazioni del proprio profilo dopo la registrazione.

**Precondizioni**:
- Utente autenticato
- Profilo esistente

**Flusso**:
1. Utente accede alla sezione profilo
2. Inserisce/aggiorna: telefono, lingua, preferenze, indirizzo
3. Sistema salva le modifiche in `profiles`

**Postcondizioni**:
- Profilo completato
- Dati aggiornati

**File**: `uc-02-complete-profile.ts`

---

## 2. Creazione Cliente da Farrier

### UC-03: Creare cliente senza account

**Attore**: Farrier

**Descrizione**: Il farrier crea un profilo cliente per qualcuno che non ha ancora un account.

**Precondizioni**:
- Farrier autenticato
- Dati minimi cliente disponibili

**Flusso**:
1. Farrier inserisce dati cliente (nome, cognome, telefono, etc.)
2. Sistema crea record in `people`
3. Sistema crea record in `profiles` con:
   - `source = 'farrier'`
   - `user_id = NULL`

**Postcondizioni**:
- Profilo cliente creato
- Cliente non può ancora accedere al sistema

**File**: `uc-03-create-customer-without-account.ts`

---

### UC-04: Collegare cliente al farrier

**Attore**: Farrier

**Descrizione**: Stabilisce la relazione tra farrier e cliente.

**Precondizioni**:
- Farrier autenticato
- Profilo cliente esistente

**Flusso**:
1. Sistema crea record in `farrier_customer_relations`
2. Collega `farrier_profile_id` e `customer_profile_id`

**Postcondizioni**:
- Relazione stabilita
- Farrier può gestire il cliente

**File**: `uc-04-link-customer-to-farrier.ts`

---

## 3. Invito e Claim Account

### UC-05: Generare invito cliente

**Attore**: Farrier

**Descrizione**: Il farrier genera un invito per permettere al cliente di reclamare il proprio profilo.

**Precondizioni**:
- Farrier autenticato
- Profilo cliente esistente con `user_id = NULL`

**Flusso**:
1. Sistema genera `claim_token` univoco
2. Sistema crea record in `profile_invitations`
3. Imposta data scadenza

**Postcondizioni**:
- Invito creato
- Token disponibile per condivisione

**File**: `uc-05-generate-invitation.ts`

---

### UC-06: Inviare invito cliente

**Attore**: Sistema

**Descrizione**: Invia l'invito al cliente attraverso vari canali.

**Precondizioni**:
- Invito generato
- Dati contatto cliente disponibili

**Flusso**:
1. Sistema genera link/QR code con token
2. Invia tramite canale scelto (email, SMS, link diretto)

**Postcondizioni**:
- Invito inviato
- Cliente può accedere al link

**File**: `uc-06-send-invitation.ts`

---

### UC-07: Claim del profilo

**Attore**: Cliente

**Descrizione**: Il cliente reclama il proprio profilo usando il token di invito.

**Precondizioni**:
- Token valido
- Utente autenticato
- Profilo non ancora reclamato

**Flusso**:
1. Cliente apre link con token
2. Sistema valida token
3. Sistema collega `profiles.user_id = auth.users.id`
4. Sistema aggiorna `invitation.status = 'claimed'`

**Postcondizioni**:
- Profilo reclamato
- Cliente ha accesso completo

**File**: `uc-07-claim-profile.ts`

---

## 4. Gestione Cavalli

### UC-08: Farrier aggiunge cavallo

**Attore**: Farrier

**Descrizione**: Il farrier aggiunge un cavallo al profilo di un cliente.

**Precondizioni**:
- Farrier autenticato
- Cliente esistente

**Flusso**:
1. Farrier inserisce dati cavallo
2. Sistema crea record in `horses` con:
   - `source = 'farrier'`
   - `verified_by_user = false`

**Postcondizioni**:
- Cavallo creato
- In attesa di conferma cliente

**File**: `uc-08-farrier-add-horse.ts`

---

### UC-09: Cliente aggiunge cavallo

**Attore**: Cliente

**Descrizione**: Il cliente aggiunge autonomamente un cavallo al proprio profilo.

**Precondizioni**:
- Cliente autenticato

**Flusso**:
1. Cliente inserisce dati cavallo
2. Sistema crea record in `horses` con:
   - `source = 'user'`
   - `verified_by_user = true`

**Postcondizioni**:
- Cavallo creato e verificato

**File**: `uc-09-customer-add-horse.ts`

---

### UC-10: Cliente conferma cavallo

**Attore**: Cliente

**Descrizione**: Il cliente conferma un cavallo aggiunto dal farrier.

**Precondizioni**:
- Cliente autenticato
- Cavallo con `verified_by_user = false`

**Flusso**:
1. Cliente visualizza cavalli da confermare
2. Cliente conferma cavallo
3. Sistema aggiorna `verified_by_user = true`

**Postcondizioni**:
- Cavallo verificato

**File**: `uc-10-verify-horse.ts`

---

### UC-11: Cliente modifica cavallo

**Attore**: Cliente

**Descrizione**: Il cliente modifica le informazioni di un cavallo.

**Precondizioni**:
- Cliente autenticato
- Cavallo di proprietà

**Flusso**:
1. Cliente accede alla scheda cavallo
2. Modifica: nome, note, foto, info
3. Sistema salva modifiche

**Postcondizioni**:
- Dati cavallo aggiornati

**File**: `uc-11-update-horse.ts`

---

### UC-12: Farrier visualizza cavalli cliente

**Attore**: Farrier

**Descrizione**: Il farrier visualizza tutti i cavalli di un cliente.

**Precondizioni**:
- Farrier autenticato
- Relazione con cliente esistente

**Flusso**:
1. Farrier seleziona cliente
2. Sistema query: `horses WHERE owner_profile_id = ?`
3. Sistema restituisce lista

**Postcondizioni**:
- Lista cavalli visualizzata

**File**: `uc-12-list-customer-horses.ts`

---

## 5. Prenotazioni

### UC-13: Farrier crea prenotazione

**Attore**: Farrier

**Descrizione**: Il farrier crea un appuntamento per un cliente.

**Precondizioni**:
- Farrier autenticato
- Cliente esistente

**Flusso**:
1. Farrier seleziona cliente e data/ora
2. Sistema crea record in `appointments`

**Postcondizioni**:
- Appuntamento creato

**File**: `uc-13-create-appointment.ts`

---

### UC-14: Aggiungere cavalli alla prenotazione

**Attore**: Farrier

**Descrizione**: Associa uno o più cavalli ad un appuntamento.

**Precondizioni**:
- Appuntamento esistente
- Cavalli del cliente disponibili

**Flusso**:
1. Farrier seleziona cavalli
2. Sistema crea record in `appointment_horses`

**Postcondizioni**:
- Cavalli associati all'appuntamento

**File**: `uc-14-add-horses-to-appointment.ts`

---

### UC-15: Cliente visualizza prenotazioni

**Attore**: Cliente

**Descrizione**: Il cliente visualizza le proprie prenotazioni.

**Precondizioni**:
- Cliente autenticato

**Flusso**:
1. Cliente accede a calendario/prenotazioni
2. Sistema query: `appointments WHERE customer_profile_id = ?`
3. Sistema restituisce lista

**Postcondizioni**:
- Lista prenotazioni visualizzata

**File**: `uc-15-list-customer-appointments.ts`

---

### UC-16: Confermare prenotazione

**Attore**: Farrier o Cliente

**Descrizione**: Conferma un appuntamento.

**Precondizioni**:
- Appuntamento in stato `pending`

**Flusso**:
1. Attore conferma appuntamento
2. Sistema aggiorna `status = 'confirmed'`

**Postcondizioni**:
- Appuntamento confermato

**File**: `uc-16-confirm-appointment.ts`

---

### UC-17: Completare prenotazione

**Attore**: Farrier

**Descrizione**: Marca un appuntamento come completato.

**Precondizioni**:
- Farrier autenticato
- Appuntamento confermato

**Flusso**:
1. Farrier completa servizio
2. Sistema aggiorna `status = 'completed'`

**Postcondizioni**:
- Appuntamento completato

**File**: `uc-17-complete-appointment.ts`

---

## 6. Gestione Relazioni

### UC-18: Farrier vede lista clienti

**Attore**: Farrier

**Descrizione**: Il farrier visualizza tutti i propri clienti.

**Precondizioni**:
- Farrier autenticato

**Flusso**:
1. Sistema query: `farrier_customer_relations JOIN profiles`
2. Filtra per `farrier_profile_id`
3. Restituisce lista clienti

**Postcondizioni**:
- Lista clienti visualizzata

**File**: `uc-18-list-farrier-customers.ts`

---

### UC-19: Cliente vede i propri farrier

**Attore**: Cliente

**Descrizione**: Il cliente visualizza i farrier che lo seguono.

**Precondizioni**:
- Cliente autenticato

**Flusso**:
1. Sistema query: `farrier_customer_relations JOIN profiles`
2. Filtra per `customer_profile_id`
3. Restituisce lista farrier

**Postcondizioni**:
- Lista farrier visualizzata

**File**: `uc-19-list-customer-farriers.ts`

---

## 7. Dati Temporanei

### UC-20: Mostrare dati temporanei all'utente

**Attore**: Sistema

**Descrizione**: Mostra al cliente i dati aggiunti dal farrier in attesa di conferma.

**Precondizioni**:
- Cliente autenticato
- Dati temporanei esistenti

**Flusso**:
1. Sistema query cavalli con:
   - `source = 'farrier'`
   - `verified_by_user = false`
2. Mostra badge "Da confermare"

**Postcondizioni**:
- Dati temporanei evidenziati

**File**: `uc-20-show-temporary-data.ts`

---

### UC-21: Cliente rifiuta cavallo

**Attore**: Cliente

**Descrizione**: Il cliente rifiuta un cavallo aggiunto dal farrier.

**Precondizioni**:
- Cliente autenticato
- Cavallo temporaneo esistente

**Flusso**:
1. Cliente visualizza cavallo da confermare
2. Cliente sceglie "Rifiuta"
3. Sistema elimina record (o imposta `status = 'rejected'`)

**Postcondizioni**:
- Cavallo rimosso/rifiutato

**File**: `uc-21-reject-horse.ts`

---

## 8. Amministrazione

### UC-22: Farrier aggiorna cliente

**Attore**: Farrier

**Descrizione**: Il farrier aggiorna le informazioni di un cliente creato da lui.

**Precondizioni**:
- Farrier autenticato
- Cliente con `source = 'farrier'`

**Flusso**:
1. Farrier modifica: telefono, note, indirizzo
2. Sistema verifica `source = 'farrier'`
3. Sistema salva modifiche

**Postcondizioni**:
- Dati cliente aggiornati

**File**: `uc-22-farrier-update-customer.ts`

---

### UC-23: Cliente aggiorna i propri dati

**Attore**: Cliente

**Descrizione**: Il cliente aggiorna autonomamente i propri dati.

**Precondizioni**:
- Cliente autenticato

**Flusso**:
1. Cliente modifica dati personali, preferenze, cavalli
2. Sistema salva modifiche

**Postcondizioni**:
- Dati aggiornati

**File**: `uc-23-customer-update-profile.ts`

---

## 9. Sicurezza

### UC-24: Validare token invito

**Attore**: Sistema

**Descrizione**: Verifica la validità di un token di invito.

**Precondizioni**:
- Token ricevuto

**Flusso**:
1. Sistema verifica:
   - Token esiste
   - Non è scaduto
   - Non è già stato usato (`status != 'claimed'`)

**Postcondizioni**:
- Token validato o rifiutato

**File**: `uc-24-validate-invitation-token.ts`

---

### UC-25: Impedire claim multiplo

**Attore**: Sistema

**Descrizione**: Previene che lo stesso profilo venga reclamato più volte.

**Precondizioni**:
- Tentativo di claim

**Flusso**:
1. Sistema verifica `invitation.status != 'claimed'`
2. Sistema verifica `profile.user_id IS NULL`
3. Se condizioni non soddisfatte, rifiuta

**Postcondizioni**:
- Claim multiplo impedito

**File**: `uc-25-prevent-multiple-claims.ts`

---

## 10. Sistema

### UC-26: Generare token

**Attore**: Sistema

**Descrizione**: Genera token univoci per inviti.

**Precondizioni**:
- Richiesta generazione token

**Flusso**:
1. Sistema genera UUID
2. Verifica unicità
3. Restituisce token

**Postcondizioni**:
- Token univoco generato

**File**: `uc-26-generate-token.ts`

---

### UC-27: Scadenza inviti

**Attore**: Sistema (Cron Job)

**Descrizione**: Gestisce automaticamente la scadenza degli inviti.

**Precondizioni**:
- Job schedulato

**Flusso**:
1. Sistema esegue query inviti scaduti
2. Aggiorna `status = 'expired'`

**Postcondizioni**:
- Inviti scaduti marcati

**File**: `uc-27-expire-invitations.ts`

---

## Use Case MVP Essenziali

Per l'MVP, i 10 use case critici sono:

1. **UC-01**: createFarrierAccount
2. **UC-03**: createCustomerProfile
3. **UC-05**: createInvitation
4. **UC-07**: claimProfile
5. **UC-08/09**: createHorse
6. **UC-10**: verifyHorse
7. **UC-13**: createAppointment
8. **UC-14**: addHorseToAppointment
9. **UC-12**: listCustomerHorses
10. **UC-18**: listFarrierCustomers

---

## Struttura File

```
temp_use_case/
├── README.md (questo file)
├── 01-account-management/
│   ├── uc-01-create-account.ts
│   └── uc-02-complete-profile.ts
├── 02-customer-creation/
│   ├── uc-03-create-customer-without-account.ts
│   └── uc-04-link-customer-to-farrier.ts
├── 03-invitations/
│   ├── uc-05-generate-invitation.ts
│   ├── uc-06-send-invitation.ts
│   └── uc-07-claim-profile.ts
├── 04-horses/
│   ├── uc-08-farrier-add-horse.ts
│   ├── uc-09-customer-add-horse.ts
│   ├── uc-10-verify-horse.ts
│   ├── uc-11-update-horse.ts
│   └── uc-12-list-customer-horses.ts
├── 05-appointments/
│   ├── uc-13-create-appointment.ts
│   ├── uc-14-add-horses-to-appointment.ts
│   ├── uc-15-list-customer-appointments.ts
│   ├── uc-16-confirm-appointment.ts
│   └── uc-17-complete-appointment.ts
├── 06-relations/
│   ├── uc-18-list-farrier-customers.ts
│   └── uc-19-list-customer-farriers.ts
├── 07-temporary-data/
│   ├── uc-20-show-temporary-data.ts
│   └── uc-21-reject-horse.ts
├── 08-administration/
│   ├── uc-22-farrier-update-customer.ts
│   └── uc-23-customer-update-profile.ts
├── 09-security/
│   ├── uc-24-validate-invitation-token.ts
│   └── uc-25-prevent-multiple-claims.ts
└── 10-system/
    ├── uc-26-generate-token.ts
    └── uc-27-expire-invitations.ts
```
