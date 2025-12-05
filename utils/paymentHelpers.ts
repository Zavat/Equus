import { supabase } from '@/lib/supabase';

export async function createPaymentRequest(
  appointmentId: string,
  payerId: string,
  amount: number,
  paymentMethod: 'pay_now' | 'pay_later' = 'pay_later',
  daysUntilDue: number = 10
): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  try {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysUntilDue);

    const platformFee = amount * 0.05;

    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        appointment_id: appointmentId,
        payer_id: payerId,
        amount,
        currency: 'EUR',
        platform_fee: platformFee,
        payment_method: paymentMethod,
        due_date: paymentMethod === 'pay_later' ? dueDate.toISOString().split('T')[0] : null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await supabase.from('notifications').insert({
      user_id: payerId,
      type: 'payment_request',
      title: 'Payment Request',
      body: `Payment of €${amount.toFixed(2)} is ${paymentMethod === 'pay_now' ? 'required now' : `due by ${dueDate.toLocaleDateString()}`}`,
      data: {
        payment_id: payment.id,
        appointment_id: appointmentId,
        amount,
      },
    });

    return { success: true, paymentId: payment.id };
  } catch (error) {
    console.error('Error creating payment request:', error);
    return { success: false, error: 'Failed to create payment request' };
  }
}

export async function markPaymentPaid(paymentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    const { data: payment } = await supabase
      .from('payments')
      .select('appointment_id, payer_id, amount')
      .eq('id', paymentId)
      .single();

    if (payment) {
      const { data: appointment } = await supabase
        .from('appointments')
        .select('farrier_id')
        .eq('id', payment.appointment_id)
        .single();

      if (appointment) {
        await supabase.from('notifications').insert({
          user_id: appointment.farrier_id,
          type: 'payment_request',
          title: 'Payment Received',
          body: `Payment of €${payment.amount.toFixed(2)} has been received`,
          data: {
            payment_id: paymentId,
            appointment_id: payment.appointment_id,
          },
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error marking payment as paid:', error);
    return { success: false, error: 'Failed to update payment status' };
  }
}

export async function checkOverduePayments(): Promise<string[]> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: overduePayments, error } = await supabase
      .from('payments')
      .select('id, payer_id, amount, due_date')
      .eq('status', 'pending')
      .lt('due_date', today);

    if (error) throw error;

    const overdueIds: string[] = [];

    for (const payment of overduePayments || []) {
      await supabase
        .from('payments')
        .update({ status: 'overdue' })
        .eq('id', payment.id);

      await supabase.from('notifications').insert({
        user_id: payment.payer_id,
        type: 'payment_due',
        title: 'Payment Overdue',
        body: `Your payment of €${payment.amount.toFixed(2)} is overdue. Please pay as soon as possible.`,
        data: {
          payment_id: payment.id,
        },
      });

      overdueIds.push(payment.id);
    }

    return overdueIds;
  } catch (error) {
    console.error('Error checking overdue payments:', error);
    return [];
  }
}

export async function calculateFollowUpDate(
  lastAppointmentDate: string,
  weeksInterval: number = 7
): Promise<Date> {
  const lastDate = new Date(lastAppointmentDate);
  const followUpDate = new Date(lastDate);
  followUpDate.setDate(followUpDate.getDate() + weeksInterval * 7);
  return followUpDate;
}

export async function suggestFollowUp(
  appointmentId: string,
  weeksInterval: number = 7
): Promise<{ success: boolean; suggestedDate?: Date; error?: string }> {
  try {
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('confirmed_date, farrier_id, customer_id')
      .eq('id', appointmentId)
      .single();

    if (error || !appointment) {
      return { success: false, error: 'Appointment not found' };
    }

    const suggestedDate = await calculateFollowUpDate(
      appointment.confirmed_date,
      weeksInterval
    );

    await supabase.from('notifications').insert([
      {
        user_id: appointment.farrier_id,
        type: 'follow_up',
        title: 'Follow-up Suggestion',
        body: `Consider scheduling a follow-up appointment around ${suggestedDate.toLocaleDateString()}`,
        data: {
          appointment_id: appointmentId,
          suggested_date: suggestedDate.toISOString(),
        },
      },
      {
        user_id: appointment.customer_id,
        type: 'follow_up',
        title: 'Follow-up Reminder',
        body: `Your horse may need shoeing again around ${suggestedDate.toLocaleDateString()}`,
        data: {
          appointment_id: appointmentId,
          suggested_date: suggestedDate.toISOString(),
        },
      },
    ]);

    return { success: true, suggestedDate };
  } catch (error) {
    console.error('Error suggesting follow-up:', error);
    return { success: false, error: 'Failed to create follow-up suggestion' };
  }
}

export function calculatePlatformFee(amount: number, feePercentage: number = 0.05): number {
  return Math.round(amount * feePercentage * 100) / 100;
}

export function calculateNetAmount(amount: number, feePercentage: number = 0.05): number {
  return amount - calculatePlatformFee(amount, feePercentage);
}
