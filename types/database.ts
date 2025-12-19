export type UserRole = 'farrier' | 'owner' | 'stable' | 'admin';
export type WorkType = 'trim' | 'two_shoes' | 'four_shoes';
export type ConsentStatus = 'active' | 'revoked';
export type CustomerType = 'owner' | 'stable';
export type AppointmentStatus =
  | 'proposed'
  | 'accepted'
  | 'declined'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';
export type PaymentMethodType = 'pay_now' | 'pay_later';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'void';
export type InvoiceStatus = 'issued' | 'paid' | 'void';
export type NotificationType =
  | 'proposal'
  | 'acceptance'
  | 'payment_request'
  | 'payment_due'
  | 'follow_up'
  | 'reminder';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';
export type HorseSex = 'male' | 'female' | 'gelding';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string;
          email: string;
          phone: string | null;
          address: string | null;
          city: string | null;
          country: string;
          latitude: number | null;
          longitude: number | null;
          stripe_account_id: string | null;
          stripe_customer_id: string | null;
          language: string;
          tax_id: string | null;
          preferred_maps_app: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: UserRole;
          full_name: string;
          email: string;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string;
          latitude?: number | null;
          longitude?: number | null;
          stripe_account_id?: string | null;
          stripe_customer_id?: string | null;
          language?: string;
          tax_id?: string | null;
          preferred_maps_app?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          full_name?: string;
          email?: string;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string;
          latitude?: number | null;
          longitude?: number | null;
          stripe_account_id?: string | null;
          stripe_customer_id?: string | null;
          language?: string;
          tax_id?: string | null;
          preferred_maps_app?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      horses: {
        Row: {
          id: string;
          owner_id: string;
          stable_id: string | null;
          name: string;
          breed: string | null;
          age: number | null;
          date_of_birth: string | null;
          sex: HorseSex | null;
          is_shod: boolean;
          work_type: WorkType;
          special_notes: string;
          issues: string | null;
          pathologies: string | null;
          last_shoeing_date: string | null;
          primary_photo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          stable_id?: string | null;
          name: string;
          breed?: string | null;
          age?: number | null;
          date_of_birth?: string | null;
          sex?: HorseSex | null;
          is_shod?: boolean;
          work_type?: WorkType;
          special_notes?: string;
          issues?: string | null;
          pathologies?: string | null;
          last_shoeing_date?: string | null;
          primary_photo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          stable_id?: string | null;
          name?: string;
          breed?: string | null;
          age?: number | null;
          date_of_birth?: string | null;
          sex?: HorseSex | null;
          is_shod?: boolean;
          work_type?: WorkType;
          special_notes?: string;
          issues?: string | null;
          pathologies?: string | null;
          last_shoeing_date?: string | null;
          primary_photo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      stable_consents: {
        Row: {
          id: string;
          horse_id: string;
          owner_id: string;
          stable_id: string;
          granted_at: string;
          revoked_at: string | null;
          status: ConsentStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          horse_id: string;
          owner_id: string;
          stable_id: string;
          granted_at?: string;
          revoked_at?: string | null;
          status?: ConsentStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          horse_id?: string;
          owner_id?: string;
          stable_id?: string;
          granted_at?: string;
          revoked_at?: string | null;
          status?: ConsentStatus;
          created_at?: string;
        };
      };
      price_lists: {
        Row: {
          id: string;
          farrier_id: string;
          service_type: WorkType;
          base_price: number;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farrier_id: string;
          service_type: WorkType;
          base_price: number;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farrier_id?: string;
          service_type?: WorkType;
          base_price?: number;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      add_ons: {
        Row: {
          id: string;
          farrier_id: string;
          code: string;
          label: string;
          price: number;
          currency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          farrier_id: string;
          code: string;
          label: string;
          price: number;
          currency?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          farrier_id?: string;
          code?: string;
          label?: string;
          price?: number;
          currency?: string;
          created_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          farrier_id: string;
          customer_id: string;
          customer_type: CustomerType;
          proposed_date: string;
          confirmed_date: string | null;
          status: AppointmentStatus;
          num_horses: number;
          sequence_order: number | null;
          total_price: number | null;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farrier_id: string;
          customer_id: string;
          customer_type: CustomerType;
          proposed_date: string;
          confirmed_date?: string | null;
          status?: AppointmentStatus;
          num_horses?: number;
          sequence_order?: number | null;
          total_price?: number | null;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farrier_id?: string;
          customer_id?: string;
          customer_type?: CustomerType;
          proposed_date?: string;
          confirmed_date?: string | null;
          status?: AppointmentStatus;
          num_horses?: number;
          sequence_order?: number | null;
          total_price?: number | null;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      appointment_horses: {
        Row: {
          id: string;
          appointment_id: string;
          horse_id: string;
          work_type: WorkType;
          weeks_since_last: number | null;
          special_notes: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          horse_id: string;
          work_type: WorkType;
          weeks_since_last?: number | null;
          special_notes?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          appointment_id?: string;
          horse_id?: string;
          work_type?: WorkType;
          weeks_since_last?: number | null;
          special_notes?: string;
          created_at?: string;
        };
      };
      appointment_modifications: {
        Row: {
          id: string;
          appointment_id: string;
          horse_id: string;
          add_on_id: string;
          quantity: number;
          unit_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          horse_id: string;
          add_on_id: string;
          quantity?: number;
          unit_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          appointment_id?: string;
          horse_id?: string;
          add_on_id?: string;
          quantity?: number;
          unit_price?: number;
          created_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          appointment_id: string;
          payer_id: string;
          amount: number;
          currency: string;
          platform_fee: number;
          payment_method: PaymentMethodType;
          due_date: string | null;
          status: PaymentStatus;
          stripe_payment_intent_id: string | null;
          stripe_transfer_id: string | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          payer_id: string;
          amount: number;
          currency?: string;
          platform_fee: number;
          payment_method: PaymentMethodType;
          due_date?: string | null;
          status?: PaymentStatus;
          stripe_payment_intent_id?: string | null;
          stripe_transfer_id?: string | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          appointment_id?: string;
          payer_id?: string;
          amount?: number;
          currency?: string;
          platform_fee?: number;
          payment_method?: PaymentMethodType;
          due_date?: string | null;
          status?: PaymentStatus;
          stripe_payment_intent_id?: string | null;
          stripe_transfer_id?: string | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          appointment_id: string;
          payment_id: string;
          invoice_number: string;
          issued_date: string;
          status: InvoiceStatus;
          pdf_url: string | null;
          language: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          payment_id: string;
          invoice_number: string;
          issued_date?: string;
          status?: InvoiceStatus;
          pdf_url?: string | null;
          language?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          appointment_id?: string;
          payment_id?: string;
          invoice_number?: string;
          issued_date?: string;
          status?: InvoiceStatus;
          pdf_url?: string | null;
          language?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string;
          data: Record<string, any>;
          read: boolean;
          sent_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string;
          data?: Record<string, any>;
          read?: boolean;
          sent_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: NotificationType;
          title?: string;
          body?: string;
          data?: Record<string, any>;
          read?: boolean;
          sent_at?: string;
          created_at?: string;
        };
      };
      horse_photos: {
        Row: {
          id: string;
          horse_id: string;
          photo_url: string;
          caption: string | null;
          is_primary: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          horse_id: string;
          photo_url: string;
          caption?: string | null;
          is_primary?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          horse_id?: string;
          photo_url?: string;
          caption?: string | null;
          is_primary?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      stable_invitations: {
        Row: {
          id: string;
          stable_id: string;
          owner_id: string;
          horse_id: string | null;
          status: InvitationStatus;
          message: string | null;
          expires_at: string;
          responded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          stable_id: string;
          owner_id: string;
          horse_id?: string | null;
          status?: InvitationStatus;
          message?: string | null;
          expires_at?: string;
          responded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          stable_id?: string;
          owner_id?: string;
          horse_id?: string | null;
          status?: InvitationStatus;
          message?: string | null;
          expires_at?: string;
          responded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
