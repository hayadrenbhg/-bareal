import 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { DarkTheme, ThemeProvider } from 'expo-router/react-navigation';
import 'react-native-reanimated';

import { LoadingScreen } from '@/components/layout/LoadingScreen';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import Colors from '@/constants/Colors';
import { getPostAuthRedirectPath } from '@/services/invite.service';
import {
  registerForPushNotifications,
  setupNotificationListeners,
} from '@/services/push.service';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

const BeReachTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.tint,
    background: Colors.dark.background,
    card: Colors.dark.surface,
    text: Colors.dark.text,
    border: Colors.dark.border,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider value={BeReachTheme}>
        <RootLayoutNav />
      </ThemeProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { session, user, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inInvite = segments[0] === 'invite';
    const inLegal = segments[0] === 'legal';
    const inRegister = inAuthGroup && segments.join('/').includes('register');

    // 招待・法務ページは未ログインでも開ける
    if (!session && !inAuthGroup && !inInvite && !inLegal) {
      router.replace('/(auth)/login');
      return;
    }

    // 登録途中（Auth 済みだがオンボーディング未完了）はホームに入れない
    if (session && profile && !profile.onboarding_completed) {
      if (!inRegister && !inInvite && !inLegal) {
        router.replace('/(auth)/register/profile');
      }
      return;
    }

    if (session && profile?.onboarding_completed && inAuthGroup) {
      void getPostAuthRedirectPath().then((path) => {
        router.replace(path as '/(tabs)');
      });
    }
  }, [session, profile, loading, segments, router]);

  useEffect(() => {
    if (!user) return;

    registerForPushNotifications(user.id).catch(() => {
      // 権限拒否時は黙って続行
    });

    return setupNotificationListeners();
  }, [user]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="notifications"
        options={{
          headerShown: true,
          title: '通知',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="post/[id]"
        options={{
          headerShown: true,
          title: '投稿詳細',
        }}
      />
      <Stack.Screen
        name="user/[id]"
        options={{
          headerShown: true,
          title: 'プロフィール',
        }}
      />
      <Stack.Screen
        name="invite/[token]"
        options={{
          headerShown: true,
          title: '招待',
        }}
      />
      <Stack.Screen
        name="invite/qr"
        options={{
          headerShown: true,
          title: 'QRで友達追加',
        }}
      />
      <Stack.Screen
        name="workouts/history"
        options={{
          headerShown: true,
          title: 'トレーニング履歴',
        }}
      />
      <Stack.Screen name="legal" />
    </Stack>
  );
}
