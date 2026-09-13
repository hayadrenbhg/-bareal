import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import { WeeklyWorkoutChart } from '@/components/profile/WeeklyWorkoutChart';
import { EmptyState } from '@/components/layout/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { useColorScheme } from '@/components/useColorScheme';
import Colors, { Brand } from '@/constants/Colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import {
  fetchPinnedPosts,
  fetchUserPosts,
  fetchWeeklyPostedAts,
} from '@/services/posts.service';
import { fetchProfileById } from '@/services/profile.service';
import {
  fetchWorkoutProfileStats,
  type WorkoutProfileStats,
} from '@/services/workouts.service';
import type { Post, Profile } from '@/types/database';
import { buildWeeklyWorkoutSummary } from '@/utils/weekly-workout';

type UserProfileViewProps = {
  userId: string;
  isOwn: boolean;
};

function mondaySinceIso(): string {
  const now = new Date();
  const since = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  return since.toISOString();
}

export function UserProfileView({ userId, isOwn }: UserProfileViewProps) {
  const colors = Colors[useColorScheme()];
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [pinned, setPinned] = useState<Post[]>([]);
  const [postedAts, setPostedAts] = useState<string[]>([]);
  const [stats, setStats] = useState<WorkoutProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [p, list, pins, workoutStats, weekAts] = await Promise.all([
      fetchProfileById(userId),
      fetchUserPosts(userId, 30),
      fetchPinnedPosts(userId),
      fetchWorkoutProfileStats(userId).catch(() => null),
      fetchWeeklyPostedAts(userId, mondaySinceIso()).catch(() => [] as string[]),
    ]);
    setProfile(p);
    setPosts(list);
    setPinned(pins);
    setStats(workoutStats);
    setPostedAts(
      workoutStats?.weekDates?.length
        ? workoutStats.weekDates.map((d) => `${d}T12:00:00+09:00`)
        : weekAts,
    );
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load()
        .catch(() => {
          setProfile(null);
        })
        .finally(() => setLoading(false));
    }, [load]),
  );

  const openInstagram = async () => {
    const handle = profile?.instagram_username?.replace(/^@/, '').trim();
    if (!handle) return;
    const appUrl = `instagram://user?username=${handle}`;
    const webUrl = `https://instagram.com/${handle}`;
    try {
      const can = await Linking.canOpenURL(appUrl);
      await Linking.openURL(can ? appUrl : webUrl);
    } catch {
      await Linking.openURL(webUrl);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <EmptyState title="プロフィールを表示できません" />
      </View>
    );
  }

  const week = buildWeeklyWorkoutSummary(
    postedAts,
    stats?.weeklyGoal ?? profile.weekly_workout_goal,
  );

  const displayName = profile.display_name?.trim() || profile.username;

  const header = (
    <View>
      <View style={styles.top}>
        <Avatar uri={profile.avatar_url} name={profile.username} size={80} />
        <View style={styles.topText}>
          <Text style={[styles.displayName, { color: colors.text }]}>{displayName}</Text>
          <Text style={[styles.username, { color: colors.textSecondary }]}>
            @{profile.username}
          </Text>
          {profile.occupation ? (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {profile.occupation}
            </Text>
          ) : null}
        </View>
      </View>

      {profile.bio ? (
        <Text style={[styles.bio, { color: colors.text }]}>{profile.bio}</Text>
      ) : null}

      {profile.gym_name ? (
        <Text style={[styles.metaLine, { color: colors.textSecondary }]}>
          {profile.gym_name}
        </Text>
      ) : null}

      {profile.instagram_username ? (
        <Pressable onPress={openInstagram} hitSlop={8} style={styles.linkRow}>
          <Text style={[styles.link, { color: Brand.accent }]}>
            Instagram @{profile.instagram_username.replace(/^@/, '')}
          </Text>
        </Pressable>
      ) : null}

      {isOwn ? (
        <Pressable
          style={[styles.editBtn, { borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/profile/edit')}
        >
          <Text style={[styles.editBtnText, { color: colors.text }]}>プロフィールを編集</Text>
        </Pressable>
      ) : null}

      <WeeklyWorkoutChart
        summary={week}
        monthlyCount={stats?.monthCount}
        weeklyStreak={stats?.weeklyStreak ?? 0}
        bodyPartCounts={stats?.bodyPartCounts}
      />

      <Pressable
        style={[styles.historyLink, { borderColor: colors.border }]}
        onPress={() =>
          router.push({
            pathname: '/workouts/history',
            params: { userId },
          })
        }
      >
        <Text style={[styles.historyLinkText, { color: colors.text }]}>
          トレーニング履歴
        </Text>
      </Pressable>

      {(pinned.length > 0 || isOwn) && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pinned</Text>
          {pinned.length === 0 ? (
            <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
              お気に入りの投稿をプロフィールに表示できます
            </Text>
          ) : (
            <View style={styles.pinRow}>
              {pinned.map((post) => (
                <Pressable
                  key={post.id}
                  style={styles.pinItem}
                  onPress={() =>
                    router.push({ pathname: '/post/[id]', params: { id: post.id } })
                  }
                >
                  <Image
                    source={{ uri: post.image_url }}
                    style={styles.pinImage}
                    contentFit="cover"
                  />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      <Text style={[styles.sectionTitle, styles.postsTitle, { color: colors.text }]}>
        Posts
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        numColumns={3}
        ListHeaderComponent={header}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={
          posts.length === 0 ? styles.flexGrow : styles.listContent
        }
        ListEmptyComponent={
          <EmptyState
            title="まだ投稿がありません"
            message={isOwn ? 'Post タブから記録できます' : undefined}
          />
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
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  flexGrow: { flexGrow: 1 },
  listContent: { paddingBottom: Spacing.xxl },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  topText: { flex: 1 },
  displayName: {
    fontSize: FontSize.title,
    fontWeight: '700',
  },
  username: {
    fontSize: FontSize.body,
    marginTop: 2,
  },
  meta: {
    fontSize: FontSize.caption,
    marginTop: Spacing.xs,
  },
  bio: {
    fontSize: FontSize.body,
    lineHeight: 22,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  metaLine: {
    fontSize: FontSize.body,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  linkRow: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  link: {
    fontSize: FontSize.body,
    fontWeight: '600',
  },
  editBtn: {
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: FontSize.body,
    fontWeight: '600',
  },
  historyLink: {
    marginTop: Spacing.sm,
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  historyLinkText: {
    fontSize: FontSize.body,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.section,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  postsTitle: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  emptyHint: {
    fontSize: FontSize.caption,
    marginBottom: Spacing.sm,
  },
  pinRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pinItem: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: '33%',
  },
  pinImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#111',
  },
  gridRow: {
    gap: 2,
    paddingHorizontal: 2,
  },
  gridItem: {
    flex: 1 / 3,
    aspectRatio: 1,
    padding: 1,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111',
  },
});
