import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
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
import { WeeklyWorkoutChart } from '@/components/profile/WeeklyWorkoutChart';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchUserPosts,
  fetchWeeklyPostedAts,
  getMonthlyPostCount,
} from '@/services/posts.service';
import {
  fetchWorkoutProfileStats,
  type WorkoutProfileStats,
} from '@/services/workouts.service';
import type { Post } from '@/types/database';
import { formatPostTime } from '@/utils/post-timing';
import { buildWeeklyWorkoutSummary } from '@/utils/weekly-workout';

export default function MyPageScreen() {
  const colors = Colors[useColorScheme()];
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [weekAts, setWeekAts] = useState<string[]>([]);
  const [stats, setStats] = useState<WorkoutProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const since = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const [list, count, ats, workoutStats] = await Promise.all([
      fetchUserPosts(user.id, 30),
      getMonthlyPostCount(user.id),
      fetchWeeklyPostedAts(user.id, since),
      fetchWorkoutProfileStats(user.id).catch(() => null),
    ]);
    setPosts(list);
    setStats(workoutStats);
    setMonthlyCount(workoutStats?.monthCount ?? count);
    setWeekAts(
      workoutStats?.weekDates?.length
        ? workoutStats.weekDates.map((d) => `${d}T12:00:00+09:00`)
        : ats,
    );
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load]),
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} size="large" />
      </View>
    );
  }

  const week = buildWeeklyWorkoutSummary(
    weekAts,
    stats?.weeklyGoal ?? profile?.weekly_workout_goal ?? null,
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        ListHeaderComponent={
          <View>
            <WeeklyWorkoutChart
              summary={week}
              monthlyCount={monthlyCount}
              weeklyStreak={stats?.weeklyStreak ?? 0}
              bodyPartCounts={stats?.bodyPartCounts}
            />
            <Pressable
              style={[styles.historyLink, { borderColor: colors.border }]}
              onPress={() =>
                router.push({
                  pathname: '/workouts/history',
                  params: user ? { userId: user.id } : undefined,
                })
              }
            >
              <Text style={[styles.historyLinkText, { color: colors.text }]}>
                トレーニング履歴
              </Text>
            </Pressable>
          </View>
        }
        contentContainerStyle={posts.length === 0 ? styles.flexGrow : styles.list}
        ListEmptyComponent={
          <EmptyState title="まだ投稿がありません" message="Post タブから記録できます" />
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.gridItem}
            onPress={() =>
              router.push({ pathname: '/post/[id]', params: { id: item.id } })
            }
          >
            <Image
              source={{ uri: item.image_url }}
              style={styles.gridImage}
              contentFit="cover"
            />
            <Text style={[styles.gridMeta, { color: colors.textSecondary }]} numberOfLines={1}>
              {formatPostTime(item.posted_at)}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flexGrow: { flexGrow: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: Spacing.xl },
  gridRow: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  gridItem: {
    flex: 1,
    marginBottom: Spacing.md,
  },
  gridImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#111',
  },
  gridMeta: {
    marginTop: Spacing.xs,
    fontSize: FontSize.caption,
  },
  historyLink: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyLinkText: {
    fontSize: FontSize.body,
    fontWeight: '600',
  },
});
