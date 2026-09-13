import { Image } from 'expo-image';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
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
import Colors, { Brand } from '@/constants/Colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchWorkoutHistory,
  formatExerciseLine,
  type WorkoutSummary,
} from '@/services/workouts.service';
import { formatPostTime } from '@/utils/post-timing';

export default function WorkoutHistoryScreen() {
  const colors = Colors[useColorScheme()];
  const { user } = useAuth();
  const params = useLocalSearchParams<{ userId?: string }>();
  const targetUserId =
    typeof params.userId === 'string' && params.userId
      ? params.userId
      : user?.id;

  const [items, setItems] = useState<WorkoutSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(
    async (offset = 0) => {
      if (!targetUserId) return;
      const page = await fetchWorkoutHistory(targetUserId, {
        limit: 20,
        offset,
      });
      setHasMore(page.length >= 20);
      setItems((prev) => (offset === 0 ? page : [...prev, ...page]));
    },
    [targetUserId],
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(0)
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, [load]),
  );

  const loadMore = async () => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      await load(items.length);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'トレーニング履歴', headerShown: true }} />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.tint} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={items.length === 0 ? styles.flexGrow : styles.list}
          ListEmptyComponent={
            <EmptyState
              title="まだ記録がありません"
              message="投稿するとトレーニング履歴に残ります"
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={colors.tint} style={{ marginVertical: Spacing.md }} />
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, { borderBottomColor: colors.border }]}
              onPress={() => {
                if (item.postId) {
                  router.push({ pathname: '/post/[id]', params: { id: item.postId } });
                }
              }}
            >
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.thumb}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.thumb, { backgroundColor: colors.surface }]} />
              )}
              <View style={styles.body}>
                <Text style={[styles.date, { color: colors.textSecondary }]}>
                  {formatPostTime(item.trainedAt)}
                </Text>
                <Text style={[styles.parts, { color: colors.text }]}>
                  {item.bodyPartsLabel || 'トレーニング'}
                </Text>
                {item.exerciseDetails.length > 0 ? (
                  <Text
                    style={[styles.exercises, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {item.exerciseDetails.map(formatExerciseLine).join(' · ')}
                  </Text>
                ) : null}
                {item.participants.length > 0 ? (
                  <View style={styles.participants}>
                    {item.participants.slice(0, 3).map((p) => (
                      <Avatar
                        key={p.id}
                        uri={p.avatar_url}
                        name={p.username}
                        size={20}
                      />
                    ))}
                    <Text style={[styles.withText, { color: colors.textSecondary }]}>
                      {item.participants
                        .map((p) => p.display_name?.trim() || p.username)
                        .join('、')}
                      と
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ color: Brand.accent, fontWeight: '700' }}>›</Text>
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
  list: { paddingBottom: Spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  date: {
    fontSize: FontSize.caption,
  },
  parts: {
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  exercises: {
    fontSize: FontSize.caption,
    lineHeight: 18,
  },
  participants: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  withText: {
    fontSize: FontSize.caption,
    flexShrink: 1,
  },
});
