import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { CreditCard, FileText, Calendar, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';

type Payment = {
  id: string;
  appointment_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  created_at: string;
  appointment?: {
    scheduled_date: string;
    profiles?: {
      full_name: string;
    };
  };
};

export default function PaymentsScreen() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          appointment:appointments(
            scheduled_date,
            profiles:farrier_id(full_name)
          )
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const filteredPayments = data?.filter((payment: any) => {
        return payment.appointment;
      }) || [];

      setPayments(filteredPayments);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }

  function renderPayment({ item }: { item: Payment }) {
    const appointment = item.appointment;
    const farrierName = appointment?.profiles?.full_name || 'Unknown';

    return (
      <TouchableOpacity style={styles.paymentCard}>
        <View style={styles.paymentHeader}>
          <View style={styles.paymentIcon}>
            <CreditCard size={24} color={Colors.silver} />
          </View>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentAmount}>
              {formatAmount(item.amount, item.currency)}
            </Text>
            <View style={styles.paymentDetail}>
              <User size={14} color={Colors.text.light} />
              <Text style={styles.paymentDetailText}>{farrierName}</Text>
            </View>
            <View style={styles.paymentDetail}>
              <Calendar size={14} color={Colors.text.light} />
              <Text style={styles.paymentDetailText}>
                {appointment?.scheduled_date
                  ? formatDate(appointment.scheduled_date)
                  : 'Date unknown'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.paymentFooter}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Completed</Text>
          </View>
          <TouchableOpacity style={styles.invoiceButton}>
            <FileText size={16} color={Colors.silver} />
            <Text style={styles.invoiceButtonText}>View Invoice</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Payments</Text>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.silver} />
          <Text style={styles.loadingText}>Loading payments...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payments</Text>
        <Text style={styles.subtitle}>{payments.length} completed payments</Text>
      </View>

      {payments.length === 0 ? (
        <View style={styles.centerContent}>
          <CreditCard size={64} color={Colors.text.light} />
          <Text style={styles.emptyTitle}>No Payments Yet</Text>
          <Text style={styles.emptyText}>
            Your completed payments will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          renderItem={renderPayment}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text.dark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.light,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.light,
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.dark,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text.light,
    textAlign: 'center',
    lineHeight: 24,
  },
  listContent: {
    padding: 16,
  },
  paymentCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  paymentHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.dark,
    marginBottom: 8,
  },
  paymentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  paymentDetailText: {
    fontSize: 14,
    color: Colors.text.light,
    marginLeft: 6,
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  invoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  invoiceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.silver,
  },
});
