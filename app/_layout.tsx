import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function RootLayoutNav() {
  const { user, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    console.log('[RootLayout] Auth state:', {
      loading,
      hasUser: !!user,
      hasProfile: !!profile,
      profileRole: profile?.role,
      segments: segments.join('/'),
    });

    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      console.log('[RootLayout] No user, redirecting to login');
      router.replace('/auth/login');
    } else if (user && profile && inAuthGroup) {
      console.log('[RootLayout] User authenticated with profile, redirecting to tabs');
      router.replace('/(tabs)');
    } else if (user && !profile && !inAuthGroup) {
      console.log('[RootLayout] User without profile, redirecting to login');
      router.replace('/auth/login');
    }
  }, [user, profile, loading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="appointment/[id]" />
      <Stack.Screen name="horses" />
      <Stack.Screen name="farrier" />
      <Stack.Screen name="stable" />
      <Stack.Screen name="services" />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

function InitializedApp() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <RootLayoutNav />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <InitializedApp />
    </GestureHandlerRootView>
  );
}
