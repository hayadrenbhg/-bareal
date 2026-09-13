import { Stack } from 'expo-router';

import Colors from '@/constants/Colors';

export default function LegalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: Colors.dark.background },
        headerTintColor: Colors.dark.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: Colors.dark.background },
      }}
    >
      <Stack.Screen name="privacy" options={{ title: 'プライバシーポリシー' }} />
      <Stack.Screen name="terms" options={{ title: '利用規約' }} />
    </Stack>
  );
}
