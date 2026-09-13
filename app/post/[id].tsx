import { Stack, useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PostCard } from '@/components/feed/PostCard';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Form';
import { useColorScheme } from '@/components/useColorScheme';
import Colors, { Brand } from '@/constants/Colors';
import { AppConfig } from '@/constants/config';
import type { ReactionType } from '@/constants/reactions';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useAuth } from '@/hooks/useAuth';
import {
  createComment,
  deleteComment,
  fetchComments,
  type PostComment,
} from '@/services/comments.service';
import {
  deletePost,
  fetchPostById,
  pinPost,
  unpinPost,
  upsertReaction,
  type FeedPost,
} from '@/services/posts.service';
import { formatRelativeTime } from '@/utils/post-timing';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = Colors[useColorScheme()];
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const listRef = useRef<FlatList<PostComment>>(null);

  const [post, setPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pinLoading, setPinLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPost = useCallback(async () => {
    if (!user || !id) return;
    const data = await fetchPostById(id, user.id);
    setPost(data);
  }, [user, id]);

  const loadComments = useCallback(async (offset = 0) => {
    if (!id) return;
    const page = await fetchComments(id, {
      limit: AppConfig.post.commentsPageSize,
      offset,
    });
    setHasMore(page.length >= AppConfig.post.commentsPageSize);
    setComments((prev) => (offset === 0 ? page : [...prev, ...page]));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setErrorMessage(null);
      Promise.all([loadPost(), loadComments(0)])
        .catch((error) => {
          Alert.alert(
            'エラー',
            error instanceof Error ? error.message : '読み込みに失敗しました',
          );
        })
        .finally(() => setLoading(false));
    }, [loadPost, loadComments]),
  );

  const handleReact = async (type: ReactionType) => {
    if (!user || !post) return;
    await upsertReaction(post.id, user.id, type);
    await loadPost();
  };

  const handlePinToggle = async () => {
    if (!user || !post || post.user_id !== user.id) return;
    setPinLoading(true);
    try {
      if (post.pin_order != null) {
        await unpinPost(user.id, post.id);
      } else {
        await pinPost(user.id, post.id);
      }
      await loadPost();
    } catch (error) {
      Alert.alert(
        'ピン留め',
        error instanceof Error ? error.message : '操作に失敗しました',
      );
    } finally {
      setPinLoading(false);
    }
  };

  const handleDeletePost = () => {
    if (!post || !user || post.user_id !== user.id) return;
    Alert.alert('投稿削除', 'この投稿を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(post);
            router.back();
          } catch (error) {
            Alert.alert(
              'エラー',
              error instanceof Error ? error.message : '削除に失敗しました',
            );
          }
        },
      },
    ]);
  };

  const handleSend = async () => {
    if (!user || !post || sending) return;
    const content = draft.trim();
    if (!content) return;

    setSending(true);
    setErrorMessage(null);

    const optimisticId = `temp-${Date.now()}`;
    const optimistic: PostComment = {
      id: optimisticId,
      post_id: post.id,
      user_id: user.id,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profile: {
        id: user.id,
        username: profile?.username ?? 'me',
        display_name: profile?.display_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
      },
    };

    setDraft('');
    setComments((prev) => [...prev, optimistic]);
    setPost((prev) =>
      prev ? { ...prev, commentCount: (prev.commentCount ?? 0) + 1 } : prev,
    );

    try {
      const created = await createComment({
        postId: post.id,
        userId: user.id,
        content,
      });
      setComments((prev) =>
        prev.map((c) => (c.id === optimisticId ? created : c)),
      );
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    } catch (error) {
      setComments((prev) => prev.filter((c) => c.id !== optimisticId));
      setPost((prev) =>
        prev
          ? { ...prev, commentCount: Math.max(0, (prev.commentCount ?? 1) - 1) }
          : prev,
      );
      setDraft(content);
      setErrorMessage(
        error instanceof Error ? error.message : 'コメントの送信に失敗しました',
      );
    } finally {
      setSending(false);
    }
  };

  const handleCommentLongPress = (comment: PostComment) => {
    if (!user || !post) return;
    const canDelete =
      comment.user_id === user.id || post.user_id === user.id;
    if (!canDelete) return;

    Alert.alert('コメント', undefined, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'コメントを削除',
        style: 'destructive',
        onPress: async () => {
          const previous = comments;
          setComments((prev) => prev.filter((c) => c.id !== comment.id));
          setPost((prev) =>
            prev
              ? {
                  ...prev,
                  commentCount: Math.max(0, (prev.commentCount ?? 1) - 1),
                }
              : prev,
          );
          try {
            await deleteComment(comment.id);
          } catch (error) {
            setComments(previous);
            setPost((prev) =>
              prev
                ? { ...prev, commentCount: (prev.commentCount ?? 0) + 1 }
                : prev,
            );
            Alert.alert(
              'エラー',
              error instanceof Error ? error.message : '削除に失敗しました',
            );
          }
        },
      },
    ]);
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      await loadComments(comments.length);
    } catch {
      // 追加読み込み失敗は黙って続行
    } finally {
      setLoadingMore(false);
    }
  };

  const isOwner = !!user && !!post && post.user_id === user.id;
  const isPinned = post?.pin_order != null;
  const canSend = draft.trim().length > 0 && !sending;

  const renderComment = ({ item }: { item: PostComment }) => {
    const name = item.profile.display_name?.trim() || item.profile.username;
    return (
      <Pressable
        onLongPress={() => handleCommentLongPress(item)}
        style={styles.commentRow}
      >
        <Pressable onPress={() => router.push(`/user/${item.user_id}`)}>
          <Avatar
            uri={item.profile.avatar_url}
            name={item.profile.username}
            size={32}
          />
        </Pressable>
        <View style={styles.commentBody}>
          <Pressable onPress={() => router.push(`/user/${item.user_id}`)}>
            <Text style={[styles.commentName, { color: colors.text }]}>{name}</Text>
          </Pressable>
          <Text style={[styles.commentContent, { color: colors.text }]}>
            {item.content}
          </Text>
          <Text style={[styles.commentTime, { color: colors.textSecondary }]}>
            {formatRelativeTime(item.created_at)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: '投稿詳細', headerShown: true }} />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.tint} size="large" />
        </View>
      ) : !post ? (
        <View style={styles.centered}>
          <Text style={{ color: colors.textSecondary }}>投稿が見つかりません</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          <FlatList
            ref={listRef}
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={renderComment}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View>
                <PostCard
                  post={post}
                  onReact={handleReact}
                  compactComments
                  onPress={() =>
                    router.push({
                      pathname: '/user/[id]',
                      params: { id: post.user_id },
                    })
                  }
                />
                {isOwner ? (
                  <View style={styles.actions}>
                    <Button
                      title={isPinned ? 'ピン留めを解除' : 'プロフィールにピン留め'}
                      variant="secondary"
                      onPress={handlePinToggle}
                      loading={pinLoading}
                    />
                    <Button
                      title="投稿を削除"
                      variant="secondary"
                      onPress={handleDeletePost}
                    />
                  </View>
                ) : null}
                <Text style={[styles.commentsTitle, { color: colors.text }]}>
                  コメント
                </Text>
                {comments.length === 0 ? (
                  <Text
                    style={[styles.emptyComments, { color: colors.textSecondary }]}
                  >
                    まだコメントはありません
                  </Text>
                ) : null}
              </View>
            }
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator
                  color={colors.tint}
                  style={{ marginVertical: Spacing.md }}
                />
              ) : null
            }
          />

          <View
            style={[
              styles.composer,
              {
                borderTopColor: colors.border,
                backgroundColor: colors.background,
                paddingBottom: Math.max(insets.bottom, Spacing.sm),
              },
            ]}
          >
            {errorMessage ? (
              <Text style={[styles.sendError, { color: Brand.accent }]}>
                {errorMessage}
              </Text>
            ) : null}
            <View style={styles.composerRow}>
              <TextInput
                value={draft}
                onChangeText={(text) => {
                  setDraft(text.slice(0, AppConfig.post.commentMaxLength));
                  setErrorMessage(null);
                }}
                placeholder="コメントを追加..."
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                multiline
                maxLength={AppConfig.post.commentMaxLength}
                editable={!sending}
              />
              <Pressable
                onPress={handleSend}
                disabled={!canSend}
                style={[
                  styles.sendButton,
                  { opacity: canSend ? 1 : 0.4 },
                ]}
              >
                {sending ? (
                  <ActivityIndicator color={Brand.accent} size="small" />
                ) : (
                  <Text style={[styles.sendText, { color: Brand.accent }]}>
                    送信
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: Spacing.md },
  actions: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  commentsTitle: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    fontSize: FontSize.bodyLarge,
    fontWeight: '700',
  },
  emptyComments: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    fontSize: FontSize.body,
  },
  commentRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  commentBody: {
    flex: 1,
  },
  commentName: {
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  commentContent: {
    marginTop: 2,
    fontSize: FontSize.body,
    lineHeight: 20,
  },
  commentTime: {
    marginTop: 4,
    fontSize: FontSize.caption,
  },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.body,
  },
  sendButton: {
    minWidth: 48,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: {
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  sendError: {
    fontSize: FontSize.caption,
    marginBottom: Spacing.xs,
  },
});
