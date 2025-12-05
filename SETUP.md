# Farrier Connect - Setup Guide

## Overview
A comprehensive mobile app connecting Farriers with Horse Owners and Stables for scheduling, payments, and route management.

## Tech Stack
- **Frontend**: React Native with Expo SDK
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Payments**: Stripe Connect (to be integrated)
- **Maps**: Apple/Google Maps integration
- **Notifications**: Expo Push Notifications

## Database Schema
The database includes the following tables:
- `profiles` - User accounts (Farrier, Owner, Stable, Admin roles)
- `horses` - Horse records with ownership tracking
- `stable_consents` - GDPR-compliant consent management
- `price_lists` - Farrier service pricing (Trim, 2 shoes, 4 shoes)
- `add_ons` - Service modifications (Aluminum shoes, Pads, etc.)
- `appointments` - Scheduling with status tracking
- `appointment_horses` - Horse details per appointment
- `appointment_modifications` - Add-ons applied to appointments
- `payments` - Payment tracking with Stripe integration
- `invoices` - Generated invoices with PDF links
- `notifications` - In-app notifications

## Features Implemented

### Core Authentication
- Email/password authentication via Supabase
- Role-based access control (Farrier/Owner/Stable/Admin)
- Profile management with location tracking
- Auto-routing based on role
- Secure password handling

### Shared Agenda View
- Yesterday/Today/Tomorrow quick view
- Expandable to Week/Month/Year
- Status-coded appointment cards (proposed, accepted, in-progress, completed)
- Real-time appointment filtering by date range
- Empty states with helpful messages

### Farrier Features
- **Home Dashboard**: Appointment overview with quick actions
- **Appointment Proposals**: Select customers, propose dates, set number of horses
- **Route Management**: Daily route with optimized stop sequences
- **Today's Route**: One-tap navigation to Apple/Google Maps
- **Complete Jobs**: Modifications sheet with dynamic pricing
- **Price List Management**: Set base prices (Trim/2/4 shoes) and custom add-ons
- **Mark Stops Complete**: Sequential job completion with auto-advance

### Owner/Stable Features
- **Home Dashboard**: Personalized greeting and appointment list
- **Accept/Decline Proposals**: Review and respond to farrier proposals
- **Horse Management**: Add, view, and manage horse records
- **Notification Center**: Real-time updates with read/unread tracking
- **Profile Management**: View and edit personal information
- **Payment Tracking**: View payment requests and due dates

### Stable-Specific Features
- **Consent Management**: View active and revoked consents
- **GDPR Compliance**: Complete audit trail of consent grants/revocations
- **Horse Data Access**: Manage horses on behalf of owners (with consent)

### Appointment Management
- **Proposal Flow**: Farriers propose, owners accept/decline
- **Status Tracking**: proposed → accepted → in_progress → completed
- **Appointment Details**: Full information including customer, location, horses
- **Job Completion**: Add modifications, calculate pricing, request payment
- **Modifications Sheet**: Dynamic add-ons with quantity selection

### Payment System
- **Payment Requests**: Automatic payment request after job completion
- **Pay Now / Pay Later**: Support for immediate or deferred payment (10 days default)
- **Platform Commission**: 5% platform fee automatically calculated
- **Payment Tracking**: pending → paid → overdue status flow
- **Notifications**: Automatic alerts for payment requests and confirmations

### Invoice Generation
- **Automatic Creation**: Invoices generated on payment completion
- **Multi-Language**: Support for EN, IT, DE with localized templates
- **Professional Format**: Detailed breakdown with services, add-ons, fees
- **HTML Generation**: Production-ready invoice HTML
- **Database Storage**: Invoice records linked to payments

### Route Optimization
- **Nearest Neighbor Algorithm**: Optimal stop sequencing
- **Distance Clustering**: Group nearby appointments
- **Score-Based Suggestions**: AI-assisted date recommendations
- **Route Distance Calculation**: Total travel distance per route

### Notification System
- **In-App Notifications**: Real-time updates in notification center
- **Push Notification Ready**: Infrastructure for Expo push notifications
- **Notification Types**: Proposals, acceptances, payments, due dates, follow-ups
- **Mark as Read**: Individual and bulk read status management
- **Edge Function**: Server-side notification creation

### Horse Management
- **Add Horses**: Create horse records with breed, age, work type
- **Track Shoeing**: Last shoeing date with weeks-since calculation
- **Special Notes**: Custom requirements (pads, aluminum shoes, etc.)
- **Work Type**: Trim / 2 Shoes / 4 Shoes classification

### Navigation & Maps
- **Apple Maps Integration**: One-tap navigation on iOS
- **Google Maps Integration**: One-tap navigation on Android
- **Sequential Stops**: Auto-advance to next appointment
- **Customer Contact**: Direct call buttons for each stop
- **Real-Time Status**: Visual indicators for completed stops

## Environment Setup

1. **Install Dependencies**
```bash
npm install
```

2. **Configure Environment Variables**
The `.env` file is already configured with Supabase credentials.

3. **Database Migration**
The database schema has been applied automatically.

## Edge Functions Deployed

### 1. create-payment-intent
**Purpose**: Handle Stripe payment intent creation
**Status**: Infrastructure ready (requires STRIPE_SECRET_KEY)
**Usage**: Called when owner selects "Pay Now"

### 2. generate-invoice
**Purpose**: Create professional invoices with multi-language support
**Status**: Fully functional (HTML generation)
**Features**: EN/IT/DE localization, detailed breakdowns, GDPR-compliant

### 3. send-notification
**Purpose**: Server-side notification delivery
**Status**: Fully functional (DB notifications)
**Features**: Multiple notification types, push-ready infrastructure

## Utilities & Helpers

### Payment Helpers (`utils/paymentHelpers.ts`)
- `createPaymentRequest()` - Create payment with platform fee calculation
- `markPaymentPaid()` - Update payment status and notify farrier
- `checkOverduePayments()` - Daily check for overdue payments
- `suggestFollowUp()` - 6-8 week follow-up suggestions
- `calculatePlatformFee()` - 5% commission calculation
- `calculateNetAmount()` - Net amount after fees

### Route Optimization (`utils/routeOptimization.ts`)
- `optimizeRoute()` - Nearest neighbor route optimization
- `clusterByDistance()` - Group nearby locations
- `suggestOptimalDates()` - AI-assisted scheduling recommendations
- `calculateRouteDistance()` - Total travel distance calculation

### Date Utilities (`utils/dateUtils.ts`)
- `getDateRange()` - Get start/end for Yesterday/Today/Tomorrow/Week/Month/Year
- `formatDate()` / `formatTime()` / `formatDateTime()` - Locale-aware formatting
- `getWeeksSince()` - Calculate weeks between dates
- `addWeeks()` - Date arithmetic for follow-ups

## Enhancement Opportunities

### 1. Stripe Connect Integration
**Current**: Payment tracking infrastructure complete
**Next**: Add Stripe Connect onboarding for Farriers
**Required**: STRIPE_SECRET_KEY, Connect webhook handling

### 2. PDF Generation
**Current**: HTML invoice generation complete
**Next**: Server-side PDF rendering (puppeteer or similar)
**Required**: PDF library integration in Edge Function

### 3. Push Notifications
**Current**: Notification database and Edge Function ready
**Next**: Expo Push Token management and sending
**Required**: Expo push notification setup, token storage

### 4. Advanced AI Scheduling
**Current**: Basic route optimization and clustering
**Next**: Machine learning for pattern recognition
**Features**: Capacity planning, weather consideration, traffic analysis

### 5. Offline Support
**Current**: Online-only operation
**Next**: Local storage with sync
**Required**: AsyncStorage, conflict resolution logic

### 6. Photo Documentation
**Current**: Text notes only
**Next**: Before/after photos per horse
**Required**: Camera integration, image upload to Supabase Storage

### 7. Analytics Dashboard
**Current**: Basic appointment listings
**Next**: Revenue charts, completion rates, customer insights
**Required**: Data aggregation queries, chart library

### 8. Multi-Currency Support
**Current**: EUR only
**Next**: User-selectable currency with conversion
**Required**: Exchange rate API, currency preferences

### 9. Appointment History per Horse
**Current**: Basic last shoeing date
**Next**: Complete shoeing history timeline
**Required**: appointment_horses table enhancement

### 10. Automated Reminders
**Current**: Manual follow-up suggestions
**Next**: Scheduled background notifications
**Required**: Cron job or scheduled Edge Function

## Running the App

### Development
```bash
npm run dev
```

### Build for Production
```bash
npm run build:web
```

## Important Notes

- **Image Assets**: Replace placeholder images in `assets/images/` with proper app icons
- **Stripe Integration**: Requires Stripe account setup and API keys
- **Maps API**: May require API keys for production use
- **Push Notifications**: Requires Expo push notification setup

## Database Security

All tables have Row Level Security (RLS) enabled with policies:
- Users can only access their own data
- Farriers can view customer data for their appointments
- Stables require active consent to manage horses
- All policies enforce authentication
- GDPR-compliant consent tracking

## File Structure

```
app/
├── (tabs)/                   # Main tab navigation
│   ├── index.tsx             # Home screen (role-based)
│   ├── route.tsx             # Farrier daily route view
│   ├── notifications.tsx     # Notification center
│   └── profile.tsx           # User profile
├── appointment/
│   └── [id].tsx              # Appointment detail with accept/decline
├── auth/                     # Authentication screens
│   ├── login.tsx             # Login screen
│   └── register.tsx          # Registration with role selection
├── farrier/
│   ├── propose.tsx           # Create appointment proposal
│   └── price-lists.tsx       # Manage prices and add-ons
├── horses/
│   ├── index.tsx             # Horse list
│   └── add.tsx               # Add new horse
├── stable/
│   └── consents.tsx          # Consent management (GDPR)
├── _layout.tsx               # Root layout with AuthProvider
└── index.tsx                 # Entry point with auth routing

components/
├── AgendaView.tsx            # Shared agenda component
└── ModificationsSheet.tsx    # Dynamic pricing with add-ons

contexts/
└── AuthContext.tsx           # Authentication & role management

lib/
└── supabase.ts               # Supabase client singleton

types/
├── database.ts               # Complete TypeScript types
└── env.d.ts                  # Environment variable types

utils/
├── dateUtils.ts              # Date formatting and ranges
├── paymentHelpers.ts         # Payment calculations and tracking
└── routeOptimization.ts      # AI route optimization algorithms

supabase/
├── functions/
│   ├── create-payment-intent/ # Stripe payment handling
│   ├── generate-invoice/      # Multi-language invoice generation
│   └── send-notification/     # Server-side notifications
└── migrations/
    └── 20251112173002_create_core_schema.sql
```

## Support

For issues or questions, refer to:
- Expo documentation: https://docs.expo.dev
- Supabase documentation: https://supabase.com/docs
- React Native documentation: https://reactnative.dev
