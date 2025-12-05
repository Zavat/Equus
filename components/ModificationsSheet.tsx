import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { X, Plus, Minus, DollarSign } from 'lucide-react-native';

interface AddOn {
  id: string;
  code: string;
  label: string;
  price: number;
  quantity: number;
}

interface PriceList {
  trim: number;
  two_shoes: number;
  four_shoes: number;
}

interface ModificationsSheetProps {
  visible: boolean;
  appointmentId: string;
  onClose: () => void;
  onComplete: () => void;
}

export function ModificationsSheet({
  visible,
  appointmentId,
  onClose,
  onComplete,
}: ModificationsSheetProps) {
  const { profile } = useAuth();
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [selectedAddOns, setSelectedAddOns] = useState<Map<string, number>>(
    new Map()
  );
  const [priceList, setPriceList] = useState<PriceList>({
    trim: 40,
    two_shoes: 80,
    four_shoes: 120,
  });
  const [basePrice, setBasePrice] = useState(120);
  const [numHorses, setNumHorses] = useState(1);
  const [customPrice, setCustomPrice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  async function loadData() {
    try {
      const { data: appointment } = await supabase
        .from('appointments')
        .select('num_horses')
        .eq('id', appointmentId)
        .single();

      if (appointment) {
        setNumHorses(appointment.num_horses);
      }

      const { data: prices } = await supabase
        .from('price_lists')
        .select('service_type, base_price')
        .eq('farrier_id', profile!.id);

      if (prices && prices.length > 0) {
        const priceMap: any = {};
        prices.forEach((p) => {
          priceMap[p.service_type] = p.base_price;
        });
        setPriceList({
          trim: priceMap.trim || 40,
          two_shoes: priceMap.two_shoes || 80,
          four_shoes: priceMap.four_shoes || 120,
        });
        setBasePrice(priceMap.four_shoes || 120);
      }

      const { data: addOnsData } = await supabase
        .from('add_ons')
        .select('*')
        .eq('farrier_id', profile!.id)
        .order('label');

      if (addOnsData) {
        setAddOns(
          addOnsData.map((a) => ({
            id: a.id,
            code: a.code,
            label: a.label,
            price: a.price,
            quantity: 0,
          }))
        );
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  function toggleAddOn(addOnId: string, quantity: number) {
    const newMap = new Map(selectedAddOns);
    if (quantity > 0) {
      newMap.set(addOnId, quantity);
    } else {
      newMap.delete(addOnId);
    }
    setSelectedAddOns(newMap);
  }

  function calculateTotal(): number {
    if (customPrice) {
      const custom = parseFloat(customPrice);
      if (!isNaN(custom)) return custom;
    }

    let total = basePrice * numHorses;

    addOns.forEach((addOn) => {
      const quantity = selectedAddOns.get(addOn.id) || 0;
      if (quantity > 0) {
        total += addOn.price * quantity;
      }
    });

    return total;
  }

  async function handleComplete() {
    setLoading(true);

    try {
      const total = calculateTotal();

      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'completed',
          total_price: total,
        })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      const modifications = [];
      for (const [addOnId, quantity] of selectedAddOns.entries()) {
        const addOn = addOns.find((a) => a.id === addOnId);
        if (addOn) {
          modifications.push({
            appointment_id: appointmentId,
            horse_id: appointmentId,
            add_on_id: addOnId,
            quantity,
            unit_price: addOn.price,
          });
        }
      }

      if (modifications.length > 0) {
        const { error: modError } = await supabase
          .from('appointment_modifications')
          .insert(modifications);

        if (modError) throw modError;
      }

      const { data: appointment } = await supabase
        .from('appointments')
        .select('customer_id')
        .eq('id', appointmentId)
        .single();

      if (appointment) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 10);

        const platformFee = total * 0.05;

        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .insert({
            appointment_id: appointmentId,
            payer_id: appointment.customer_id,
            amount: total,
            currency: 'EUR',
            platform_fee: platformFee,
            payment_method: 'pay_later',
            due_date: dueDate.toISOString().split('T')[0],
            status: 'pending',
          })
          .select()
          .single();

        if (paymentError) throw paymentError;

        await supabase.from('notifications').insert({
          user_id: appointment.customer_id,
          type: 'payment_request',
          title: 'Payment Request',
          body: `Your farrier has completed the work. Total: €${total.toFixed(2)}. Payment due by ${dueDate.toLocaleDateString()}.`,
          data: {
            appointment_id: appointmentId,
            payment_id: payment.id,
            amount: total,
          },
        });
      }

      Alert.alert('Success', 'Job completed! Payment request sent.', [
        { text: 'OK', onPress: onComplete },
      ]);
    } catch (error) {
      console.error('Error completing job:', error);
      Alert.alert('Error', 'Failed to complete job. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Complete Job</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Base Service</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Service per horse</Text>
              <Text style={styles.priceValue}>€{basePrice.toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Number of horses</Text>
              <Text style={styles.priceValue}>×{numHorses}</Text>
            </View>
            <View style={[styles.priceRow, styles.subtotalRow]}>
              <Text style={styles.subtotalLabel}>Subtotal</Text>
              <Text style={styles.subtotalValue}>
                €{(basePrice * numHorses).toFixed(2)}
              </Text>
            </View>
          </View>

          {addOns.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add-ons & Modifications</Text>
              {addOns.map((addOn) => {
                const quantity = selectedAddOns.get(addOn.id) || 0;
                return (
                  <View key={addOn.id} style={styles.addOnRow}>
                    <View style={styles.addOnInfo}>
                      <Text style={styles.addOnLabel}>{addOn.label}</Text>
                      <Text style={styles.addOnPrice}>
                        €{addOn.price.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.quantityControl}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() =>
                          toggleAddOn(addOn.id, Math.max(0, quantity - 1))
                        }
                      >
                        <Minus size={16} color="#007AFF" />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{quantity}</Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => toggleAddOn(addOn.id, quantity + 1)}
                      >
                        <Plus size={16} color="#007AFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Custom Price (Optional)</Text>
            <Text style={styles.helperText}>
              Override calculated price if needed
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter custom amount"
              value={customPrice}
              onChangeText={setCustomPrice}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.totalCard}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>€{calculateTotal().toFixed(2)}</Text>
            </View>
            <Text style={styles.totalSubtext}>
              Platform fee: €{(calculateTotal() * 0.05).toFixed(2)} (5%)
            </Text>
            <Text style={styles.totalSubtext}>
              You receive: €{(calculateTotal() * 0.95).toFixed(2)}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.completeButton, loading && styles.buttonDisabled]}
            onPress={handleComplete}
            disabled={loading}
          >
            <DollarSign size={20} color="#FFF" />
            <Text style={styles.completeButtonText}>
              {loading ? 'Processing...' : 'Complete & Request Payment'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  subtotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 8,
    paddingTop: 12,
  },
  subtotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  subtotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  addOnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  addOnInfo: {
    flex: 1,
  },
  addOnLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  addOnPrice: {
    fontSize: 12,
    color: '#666',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    minWidth: 24,
    textAlign: 'center',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  totalCard: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
  },
  totalSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  footer: {
    backgroundColor: '#FFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: '#B0C4DE',
  },
  completeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
