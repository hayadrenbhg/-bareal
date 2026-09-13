import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { EmptyState } from '@/components/layout/EmptyState';
import { PostCard } from '@/components/feed/PostCard';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import type { ReactionType } from '@/constants/reactions';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useAuth } from '@/hooks/useAuth';
import { blockUser, reportContent } from '@/services/notifications.service';
import { fetchFeed, upsertReaction, type FeedPost } from '@/services/posts.service';

export default function HomeScreen() {
  const colors = Colors[useColorScheme()];
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchFeed(user.id);
      setPosts(data);
    } catch (error) {
      Alert.alert(
        '読み込みエラー',
        error instanceof Error ? error.message : 'フィードの取得に失敗しました',
      );
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleReact = async (postId: string, type: ReactionType) => {
    if (!user) return;
    try {
      await upsertReaction(postId, user.id, type);
      await load();
    } catch (error) {
      Alert.alert(
        'エラー',
        error instanceof Error ? error.message : 'リアクションに失敗しました',
      );
    }
  };

  const handleLongPress = (post: FeedPost) => {
    if (!user || post.user_id === user.id) return;

    Alert.alert('投稿メニュー', `@${post.profile.username}`, [
      {
        text: '通報',
        onPress: () => {
          Alert.prompt?.(
            '通報理由',
            '理由を入力してください',
            async (reason) => {
              if (!reason?.trim()) return;
              try {
                await reportContent({
                  reporterId: user.id,
                  reportedUserId: post.user_id,
                  postId: post.id,
                  reason,
                });
                Alert.alert('送信完了', '通報を受け付けました');
              } catch (error) {
                Alert.alert(
                  'エラー',
                  error instanceof Error ? error.message : '通報に失敗しました',
                );
              }
            },
          ) ??
            Alert.alert('通報', '不適切な投稿として通報しますか？', [
              { text: 'キャンセル', style: 'cancel' },
              {
                text: '通報する',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await reportContent({
                      reporterId: user.id,
                      reportedUserId: post.user_id,
                      postId: post.id,
                      reason: 'inappropriate',
                    });
                    Alert.alert('送信完了', '通報を受け付けました');
                  } catch (error) {
                    Alert.alert(
                      'エラー',
                      error instanceof Error ? error.message : '通報に失敗しました',
                    );
                  }
                },
              },
            ]);
        },
      },
      {
        text: 'ブロック',
        style: 'destructive',
        onPress: async () => {
          try {
            await blockUser(user.id, post.user_id);
            Alert.alert('完了', 'ユーザーをブロックしました');
            await load();
          } catch (error) {
            Alert.alert(
              'エラー',
              error instanceof Error ? error.message : 'ブロックに失敗しました',
            );
          }
        },
      },
      { text: 'キャンセル', style: 'cancel' },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <Text style={[styles.title, { color: colors.text }]}>Be Reach</Text>
        <Pressable onPress={() => router.push('/notifications')} hitSlop={12}>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        contentContainerStyle={posts.length === 0 ? styles.flexGrow : styles.list}
        ListEmptyComponent={
          <EmptyState title="まだ投稿がありません" message="友達の投稿がここに表示されます" />
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onReact={(type) => handleReact(item.id, type)}
            onPress={() => router.push({ pathname: '/post/[id]', params: { id: item.id } })}
            onLongPress={() => handleLongPress(item)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flexGrow: { flexGrow: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: { fontSize: FontSize.title, fontWeight: '700' },
  list: { paddingTop: Spacing.sm, paddingBottom: Spacing.xl },
});
