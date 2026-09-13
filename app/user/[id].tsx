import { Stack, useLocalSearchParams } from 'expo-router';

import { UserProfileView } from '@/components/profile/UserProfileView';
import { useAuth } from '@/hooks/useAuth';
import Colors from '@/constants/Colors';

export default function OtherUserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const isOwn = !!user && user.id === id;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'プロフィール',
          headerStyle: { backgroundColor: Colors.dark.background },
          headerTintColor: Colors.dark.text,
        }}
      />
      {id ? <UserProfileView userId={id} isOwn={isOwn} /> : null}
    </>
  );
}
