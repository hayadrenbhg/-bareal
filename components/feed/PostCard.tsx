import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { useColorScheme } from '@/components/useColorScheme';
import Colors, { Brand } from '@/constants/Colors';
import { REACTIONS, getReactionEmoji, type ReactionType } from '@/constants/reactions';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import type { FeedPost, MentionedUser } from '@/services/posts.service';
import { formatPostTime } from '@/utils/post-timing';

type PostCardProps = {
  post: FeedPost;
  onReact: (type: ReactionType) => void;
  onPress?: () => void;
  onLongPress?: () => void;
  onCommentPress?: () => void;
  /** 詳細画面ではコメント件数の下に一覧があるのでリンク文言を弱める */
  compactComments?: boolean;
};

function mentionLabel(user: MentionedUser): string {
  return user.display_name?.trim() || user.username;
}

export function PostCard({
  post,
  onReact,
  onPress,
  onLongPress,
  onCommentPress,
  compactComments = false,
}: PostCardProps) {
  const colors = Colors[useColorScheme()];
  const counts = REACTIONS.map((reaction) => ({
    ...reaction,
    count: post.reactions.filter((r) => r.reaction_type === reaction.type).length,
  }));

  const timingLabel =
    post.timing_status === 'on_time'
      ? 'ON TIME'
      : post.timing_status === 'late'
        ? 'LATE'
        : null;

  const mentions = post.mentions ?? [];
  const commentCount = post.commentCount ?? 0;

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={styles.wrap}>
      <View style={styles.header}>
        <Avatar uri={post.profile.avatar_url} name={post.profile.username} size={36} />
        <View style={styles.headerText}>
          <Text style={[styles.username, { color: colors.text }]}>
            @{post.profile.username}
          </Text>
          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {formatPostTime(post.posted_at)}
            {timingLabel ? ` · ${timingLabel}` : ''}
          </Text>
        </View>
      </View>

      <Image source={{ uri: post.image_url }} style={styles.image} contentFit="cover" />

      {post.workout?.bodyPartsLabel ? (
        <Text style={[styles.trainingLabel, { color: colors.textSecondary }]}>
          {post.workout.bodyPartsLabel}
        </Text>
      ) : null}

      {mentions.length > 0 ? (
        <View style={styles.mentionsRow}>
          {mentions.map((m, index) => (
            <View key={m.id} style={styles.mentionItem}>
              {index > 0 ? (
                <Text style={[styles.mentionsPrefix, { color: colors.textSecondary }]}>
                  、
                </Text>
              ) : null}
              <Pressable
                onPress={() => router.push(`/user/${m.id}`)}
                hitSlop={4}
                style={styles.mentionPress}
              >
                <Avatar uri={m.avatar_url} name={m.username} size={20} />
                <Text style={[styles.mentionName, { color: colors.text }]}>
                  {mentionLabel(m)}
                </Text>
              </Pressable>
            </View>
          ))}
          <Text style={[styles.mentionsPrefix, { color: colors.textSecondary }]}>
            とトレーニング
          </Text>
        </View>
      ) : null}

      {post.caption ? (
        <Text
          style={[
            styles.caption,
            {
              color: colors.text,
              paddingTop:
                mentions.length > 0 || post.workout?.bodyPartsLabel
                  ? Spacing.sm
                  : Spacing.md,
            },
          ]}
          numberOfLines={4}
        >
          {post.caption}
        </Text>
      ) : null}

      {post.workout?.exerciseDetails && post.workout.exerciseDetails.length > 0 ? (
        <Text
          style={[styles.exercises, { color: colors.textSecondary }]}
          numberOfLines={3}
        >
          {post.workout.exerciseDetails
            .map((ex) => {
              const bits = [ex.name];
              if (ex.weightKg != null) bits.push(`${ex.weightKg}kg`);
              if (ex.reps != null) bits.push(`×${ex.reps}`);
              if (ex.sets != null) bits.push(`×${ex.sets}`);
              return bits.join(' ');
            })
            .join(' · ')}
        </Text>
      ) : post.workout?.exercises && post.workout.exercises.length > 0 ? (
        <Text
          style={[styles.exercises, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {post.workout.exercises.join(' · ')}
        </Text>
      ) : null}

      <View style={styles.reactions}>
        {counts.map((reaction) => {
          const active = post.myReaction === reaction.type;
          return (
            <Pressable
              key={reaction.type}
              onPress={() => onReact(reaction.type)}
              hitSlop={6}
              style={styles.reactionButton}
            >
              <Text style={[styles.reactionEmoji, active && styles.reactionActive]}>
                {reaction.emoji}
              </Text>
              {reaction.count > 0 ? (
                <Text
                  style={[
                    styles.reactionCount,
                    { color: active ? Brand.accent : colors.textSecondary },
                  ]}
                >
                  {reaction.count}
                </Text>
              ) : null}
            </Pressable>
          );
        })}

        <Pressable
          onPress={onCommentPress ?? onPress}
          hitSlop={6}
          style={styles.reactionButton}
        >
          <Ionicons
            name="chatbubble-outline"
            size={18}
            color={colors.textSecondary}
          />
          <Text style={[styles.reactionCount, { color: colors.textSecondary }]}>
            {commentCount}
          </Text>
        </Pressable>
      </View>

      {!compactComments && commentCount > 0 ? (
        <Pressable
          onPress={onCommentPress ?? onPress}
          hitSlop={6}
          style={styles.commentLink}
        >
          <Text style={[styles.commentLinkText, { color: colors.textSecondary }]}>
            コメント{commentCount}件を表示
          </Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export function ReactionSummary({ reactions }: { reactions: FeedPost['reactions'] }) {
  if (reactions.length === 0) return null;
  const summary = REACTIONS.map((r) => ({
    ...r,
    count: reactions.filter((x) => x.reaction_type === r.type).length,
  })).filter((r) => r.count > 0);

  return (
    <Text>
      {summary.map((r) => `${getReactionEmoji(r.type)} ${r.count}`).join('  ')}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  username: {
    fontSize: FontSize.body,
    fontWeight: '600',
  },
  time: {
    fontSize: FontSize.caption,
    marginTop: 2,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#111',
  },
  trainingLabel: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  mentionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: 4,
  },
  mentionsPrefix: {
    fontSize: FontSize.caption,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mentionPress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mentionName: {
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
  caption: {
    paddingHorizontal: Spacing.lg,
    fontSize: FontSize.body,
    lineHeight: 22,
  },
  exercises: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    fontSize: FontSize.caption,
  },
  reactions: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 36,
  },
  reactionEmoji: {
    fontSize: 20,
  },
  reactionActive: {
    opacity: 1,
  },
  reactionCount: {
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
  commentLink: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  commentLinkText: {
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
});
