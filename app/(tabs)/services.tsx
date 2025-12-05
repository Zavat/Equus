import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Wrench, Plus } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

export default function ServicesScreen() {
  const router = useRouter();

  function handleRequestService() {
    router.push('/services/request');
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Services</Text>
        <Text style={styles.subtitle}>Request farrier or veterinary services</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.serviceCard}>
          <View style={styles.serviceIcon}>
            <Wrench size={32} color={Colors.silver} />
          </View>
          <Text style={styles.serviceTitle}>Farrier Services</Text>
          <Text style={styles.serviceDescription}>
            Request horseshoeing services for your horses
          </Text>
          <TouchableOpacity
            style={styles.requestButton}
            onPress={handleRequestService}
          >
            <Plus size={20} color={Colors.white} />
            <Text style={styles.requestButtonText}>Request Shoeing</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.serviceCard}>
          <View style={styles.serviceIcon}>
            <Wrench size={32} color={Colors.silver} />
          </View>
          <Text style={styles.serviceTitle}>Veterinary Services</Text>
          <Text style={styles.serviceDescription}>
            Request veterinary services for your horses
          </Text>
          <TouchableOpacity
            style={[styles.requestButton, styles.requestButtonSecondary]}
            onPress={() => {}}
          >
            <Plus size={20} color={Colors.silver} />
            <Text style={[styles.requestButtonText, styles.requestButtonTextSecondary]}>
              Coming Soon
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
    padding: 16,
  },
  serviceCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
    alignItems: 'center',
  },
  serviceIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.dark,
    marginBottom: 8,
    textAlign: 'center',
  },
  serviceDescription: {
    fontSize: 15,
    color: Colors.text.light,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.silver,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestButtonSecondary: {
    backgroundColor: Colors.background.primary,
    borderWidth: 2,
    borderColor: Colors.silver,
  },
  requestButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  requestButtonTextSecondary: {
    color: Colors.silver,
  },
});
