import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { DollarSign, Plus, Trash2 } from 'lucide-react-native';

interface PriceList {
  id: string;
  service_type: string;
  base_price: number;
}

interface AddOn {
  id: string;
  code: string;
  label: string;
  price: number;
}

export default function PriceListsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [prices, setPrices] = useState<PriceList[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAddOn, setNewAddOn] = useState({ code: '', label: '', price: '' });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    if (!profile) return;

    try {
      const [pricesResult, addOnsResult] = await Promise.all([
        supabase
          .from('price_lists')
          .select('*')
          .eq('farrier_id', profile.id)
          .order('service_type'),
        supabase
          .from('add_ons')
          .select('*')
          .eq('farrier_id', profile.id)
          .order('label'),
      ]);

      if (pricesResult.data) setPrices(pricesResult.data);
      if (addOnsResult.data) setAddOns(addOnsResult.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updatePrice(serviceType: string, price: string) {
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) return;

    try {
      const existing = prices.find((p) => p.service_type === serviceType);

      if (existing) {
        const { error } = await supabase
          .from('price_lists')
          .update({ base_price: priceNum })
          .eq('id', existing.id);

        if (error) throw error;

        setPrices((prev) =>
          prev.map((p) =>
            p.service_type === serviceType ? { ...p, base_price: priceNum } : p
          )
        );
      } else {
        const { data, error } = await supabase
          .from('price_lists')
          .insert({
            farrier_id: profile!.id,
            service_type: serviceType,
            base_price: priceNum,
          })
          .select()
          .single();

        if (error) throw error;
        setPrices((prev) => [...prev, data]);
      }
    } catch (error) {
      console.error('Error updating price:', error);
      Alert.alert('Error', 'Failed to update price');
    }
  }

  async function addNewAddOn() {
    if (!newAddOn.code || !newAddOn.label || !newAddOn.price) {
      Alert.alert('Missing Information', 'Please fill in all fields');
      return;
    }

    const priceNum = parseFloat(newAddOn.price);
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('add_ons')
        .insert({
          farrier_id: profile!.id,
          code: newAddOn.code,
          label: newAddOn.label,
          price: priceNum,
        })
        .select()
        .single();

      if (error) throw error;

      setAddOns((prev) => [...prev, data]);
      setNewAddOn({ code: '', label: '', price: '' });
      Alert.alert('Success', 'Add-on created successfully');
    } catch (error) {
      console.error('Error creating add-on:', error);
      Alert.alert('Error', 'Failed to create add-on');
    }
  }

  async function deleteAddOn(id: string) {
    Alert.alert('Delete Add-on', 'Are you sure you want to delete this add-on?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('add_ons')
              .delete()
              .eq('id', id);

            if (error) throw error;
            setAddOns((prev) => prev.filter((a) => a.id !== id));
          } catch (error) {
            console.error('Error deleting add-on:', error);
            Alert.alert('Error', 'Failed to delete add-on');
          }
        },
      },
    ]);
  }

  function getPrice(serviceType: string): string {
    const price = prices.find((p) => p.service_type === serviceType);
    return price ? price.base_price.toString() : '';
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Price Lists</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Base Services</Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Trim</Text>
            <View style={styles.priceInputContainer}>
              <DollarSign size={16} color="#666" />
              <TextInput
                style={styles.priceInput}
                placeholder="0.00"
                value={getPrice('trim')}
                onChangeText={(text) => updatePrice('trim', text)}
                keyboardType="decimal-pad"
                onBlur={() => {}}
              />
            </View>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>2 Shoes</Text>
            <View style={styles.priceInputContainer}>
              <DollarSign size={16} color="#666" />
              <TextInput
                style={styles.priceInput}
                placeholder="0.00"
                value={getPrice('two_shoes')}
                onChangeText={(text) => updatePrice('two_shoes', text)}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>4 Shoes</Text>
            <View style={styles.priceInputContainer}>
              <DollarSign size={16} color="#666" />
              <TextInput
                style={styles.priceInput}
                placeholder="0.00"
                value={getPrice('four_shoes')}
                onChangeText={(text) => updatePrice('four_shoes', text)}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add-ons & Modifications</Text>

          {addOns.map((addOn) => (
            <View key={addOn.id} style={styles.addOnRow}>
              <View style={styles.addOnInfo}>
                <Text style={styles.addOnLabel}>{addOn.label}</Text>
                <Text style={styles.addOnCode}>Code: {addOn.code}</Text>
              </View>
              <View style={styles.addOnRight}>
                <Text style={styles.addOnPrice}>€{addOn.price.toFixed(2)}</Text>
                <TouchableOpacity onPress={() => deleteAddOn(addOn.id)}>
                  <Trash2 size={20} color="#F44336" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <View style={styles.newAddOnForm}>
            <Text style={styles.formTitle}>Add New Modification</Text>
            <TextInput
              style={styles.input}
              placeholder="Code (e.g., ALU)"
              value={newAddOn.code}
              onChangeText={(text) =>
                setNewAddOn({ ...newAddOn, code: text })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Label (e.g., Aluminum Shoes)"
              value={newAddOn.label}
              onChangeText={(text) =>
                setNewAddOn({ ...newAddOn, label: text })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Price"
              value={newAddOn.price}
              onChangeText={(text) =>
                setNewAddOn({ ...newAddOn, price: text })
              }
              keyboardType="decimal-pad"
            />
            <TouchableOpacity style={styles.addButton} onPress={addNewAddOn}>
              <Plus size={20} color="#FFF" />
              <Text style={styles.addButtonText}>Add Modification</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  priceInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingVertical: 8,
    minWidth: 80,
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
  addOnCode: {
    fontSize: 12,
    color: '#666',
  },
  addOnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  addOnPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  newAddOnForm: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#E0E0E0',
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
