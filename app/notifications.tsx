import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState } from '@/components/layout/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '@/services/notifications.service';
import { formatPostTime } from '@/utils/post-timing';

export default function NotificationsScreen() {
  const colors = Colors[useColorScheme()];
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const data = await fetchNotifications(user.id);
    setItems(data);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load()
        .then(async () => {
          if (user) await markAllNotificationsRead(user.id);
        })
        .finally(() => setLoading(false));
    }, [load, user]),
  );

  const openItem = async (item: NotificationItem) => {
    await markNotificationRead(item.id);
    if (item.type === 'friend_request' || item.type === 'friend_accepted') {
      router.push('/(tabs)/friends');
      return;
    }
    if (item.post_id) {
      router.push({ pathname: '/post/[id]', params: { id: item.post_id } });
      return;
    }
    if (item.type === 'daily_event') {
      router.push('/(tabs)/post');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: '通知', headerShown: true }} />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.tint} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={items.length === 0 ? styles.flexGrow : undefined}
          ListEmptyComponent={
            <EmptyState title="通知はありません" message="友達申請・リアクション・コメントがここに届きます" />
          }
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.row,
                {
                  borderBottomColor: colors.border,
                  backgroundColor: item.read_at ? 'transparent' : colors.surface,
                },
              ]}
              onPress={() => openItem(item)}
            >
              <Avatar
                uri={item.actor?.avatar_url}
                name={item.actor?.username ?? 'B'}
                size={44}
              />
              <View style={styles.body}>
                <Text style={[styles.message, { color: colors.text }]}>{item.message}</Text>
                <Text style={[styles.time, { color: colors.textSecondary }]}>
                  {formatPostTime(item.created_at)}
                  {item.actor ? ` · @${item.actor.username}` : ''}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  flexGrow: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  body: { flex: 1 },
  message: { fontSize: 15, fontWeight: '600' },
  time: { fontSize: 12, marginTop: 4 },
});
