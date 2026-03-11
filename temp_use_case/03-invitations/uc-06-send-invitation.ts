import { supabase } from '@/lib/supabase';

/**
 * UC-06: Inviare invito cliente
 *
 * Attore: Sistema
 * Descrizione: Invia l'invito al cliente attraverso vari canali
 */

type InvitationChannel = 'email' | 'sms' | 'link' | 'qr';

interface SendInvitationInput {
  claimToken: string;
  customerEmail?: string;
  customerPhone?: string;
  channel: InvitationChannel;
  baseUrl: string;
}

interface SendInvitationResult {
  success: boolean;
  invitationLink?: string;
  qrCodeData?: string;
  error?: string;
}

export async function sendInvitation(
  input: SendInvitationInput
): Promise<SendInvitationResult> {
  try {
    // Generare link di invito
    const invitationLink = `${input.baseUrl}/claim?token=${input.claimToken}`;

    switch (input.channel) {
      case 'link':
        // Restituire semplicemente il link
        return {
          success: true,
          invitationLink,
        };

      case 'qr':
        // Generare QR code data (il frontend dovrà renderizzarlo)
        return {
          success: true,
          invitationLink,
          qrCodeData: invitationLink,
        };

      case 'email':
        // Inviare email tramite Edge Function
        if (!input.customerEmail) {
          return {
            success: false,
            error: 'Email del cliente mancante',
          };
        }

        const { error: emailError } = await supabase.functions.invoke(
          'send-notification',
          {
            body: {
              type: 'email',
              to: input.customerEmail,
              subject: 'Invito a reclamare il tuo profilo',
              template: 'invitation',
              data: {
                invitationLink,
              },
            },
          }
        );

        if (emailError) {
          return {
            success: false,
            error: 'Errore durante l\'invio dell\'email',
          };
        }

        return {
          success: true,
          invitationLink,
        };

      case 'sms':
        // Inviare SMS tramite Edge Function
        if (!input.customerPhone) {
          return {
            success: false,
            error: 'Telefono del cliente mancante',
          };
        }

        const { error: smsError } = await supabase.functions.invoke(
          'send-notification',
          {
            body: {
              type: 'sms',
              to: input.customerPhone,
              message: `Sei stato invitato a reclamare il tuo profilo: ${invitationLink}`,
            },
          }
        );

        if (smsError) {
          return {
            success: false,
            error: 'Errore durante l\'invio dell\'SMS',
          };
        }

        return {
          success: true,
          invitationLink,
        };

      default:
        return {
          success: false,
          error: 'Canale di invio non supportato',
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}
