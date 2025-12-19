import { Stack } from 'expo-router';

export default function FarrierLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="propose" />
      <Stack.Screen name="price-lists" />
    </Stack>
  );
}
