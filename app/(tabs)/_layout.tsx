import { Tabs } from 'expo-router';
import { Calendar, MapPin, User, Users, Wrench, CreditCard } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '@/constants/colors';

export default function TabLayout() {
  const { isFarrier, isOwner } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.silver,
        tabBarInactiveTintColor: Colors.text.light,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border.light,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => (
            <Calendar size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="route"
        options={{
          title: 'Route',
          href: isFarrier ? undefined : null,
          tabBarIcon: ({ size, color }) => (
            <MapPin size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          href: isFarrier ? undefined : null,
          tabBarIcon: ({ size, color }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
          href: isOwner ? undefined : null,
          tabBarIcon: ({ size, color }) => <Wrench size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Payments',
          href: isOwner ? undefined : null,
          tabBarIcon: ({ size, color }) => <CreditCard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
