import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';

import { upsertPushToken } from '@/services/notifications.service';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[Be Reach] Push 通知は実機でのみ利用できます');
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );

  const token = tokenResponse.data;
  await upsertPushToken({
    userId,
    token,
    deviceId: Device.modelId ?? Device.modelName ?? null,
  });

  return token;
}

export function setupNotificationListeners() {
  const receivedSub = Notifications.addNotificationReceivedListener(() => {
    // フォアグラウンド受信時は通知一覧をあとで更新
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as {
      screen?: string;
      postId?: string;
    };

    if (data?.screen === 'post') {
      router.push('/(tabs)/post');
      return;
    }

    if (data?.postId) {
      router.push({ pathname: '/post/[id]', params: { id: data.postId } });
      return;
    }

    if (data?.screen === 'friends') {
      router.push('/(tabs)/friends');
      return;
    }

    router.push('/notifications');
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
