import { Stack } from 'expo-router';

import { RegisterDraftProvider } from '@/hooks/useRegisterDraft';

export default function RegisterLayout() {
  return (
    <RegisterDraftProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0D0D0D' },
          animation: 'slide_from_right',
        }}
      />
    </RegisterDraftProvider>
  );
}
