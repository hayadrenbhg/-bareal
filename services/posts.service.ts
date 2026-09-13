import { AppConfig } from '@/constants/config';
import type { BodyPartKey } from '@/constants/training';
import { supabase } from '@/lib/supabase';
import { deletePostImage, uploadPostImage } from '@/lib/storage';
import type { DailyEvent, Post, Profile, Reaction, ReactionType } from '@/types/database';
import { getTimingStatus } from '@/utils/post-timing';
import { createUuid } from '@/utils/uuid';
import { createWorkoutForPost, mapWorkoutRow, type ExerciseInput, type WorkoutSummary } from '@/services/workouts.service';

export type MentionedUser = Pick<
  Profile,
  'id' | 'username' | 'display_name' | 'avatar_url'
>;

export type FeedPost = Post & {
  profile: Profile;
  reactions: Reaction[];
  myReaction: ReactionType | null;
  mentions: MentionedUser[];
  commentCount: number;
  workout: WorkoutSummary | null;
};

function mapPostError(message: string): string {
  if (
    message.includes('posts_daily_limit_jst') ||
    message.includes('posts_one_per_day_jst')
  ) {
    return '今日の投稿は2回までです';
  }
  if (message.includes('posts_caption_too_long')) {
    return `ひとことは${AppConfig.post.captionMaxLength}文字以内にしてください`;
  }
  if (message.includes('post_mentions_not_friends')) {
    return '友達ではないユーザーは追加できません';
  }
  if (message.includes('post_mentions_limit')) {
    return `一緒にトレーニングした人は${AppConfig.post.maxMentions}人までです`;
  }
  if (message.includes('post_mentions_no_self')) {
    return '自分自身は追加できません';
  }
  if (message.includes('post_mentions_unique_pair') || message.includes('duplicate')) {
    return '同じ友達を重複して追加できません';
  }
  return '投稿の保存に失敗しました';
}

function mapMentions(rows: unknown): MentionedUser[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const r = row as {
        mentioned_user_id?: string;
        profile?: Profile | Profile[] | null;
      };
      const profile = Array.isArray(r.profile) ? r.profile[0] : r.profile;
      if (!profile) return null;
      return {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      };
    })
    .filter((m): m is MentionedUser => !!m);
}

export async function getTodayDailyEvent(): Promise<DailyEvent | null> {
  const { data, error } = await supabase.rpc('get_today_daily_event');
  if (error) {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: AppConfig.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    const { data: fallback } = await supabase
      .from('daily_events')
      .select('*')
      .eq('event_date', today)
      .maybeSingle();

    return fallback;
  }

  if (Array.isArray(data) && data.length > 0) {
    return data[0] as DailyEvent;
  }
  return null;
}

/** JST 基準の今日の投稿数（DB RPC 優先） */
export async function getTodayPostCount(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('count_posts_today_jst', {
    p_user_id: userId,
  });

  if (!error && typeof data === 'number') {
    return data;
  }

  const posts = await fetchUserPosts(userId, 10);
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: AppConfig.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  return posts.filter((post) => {
    const postDay = new Intl.DateTimeFormat('en-CA', {
      timeZone: AppConfig.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(post.posted_at));
    return postDay === today;
  }).length;
}

export async function getRemainingPostsToday(userId: string): Promise<number> {
  const count = await getTodayPostCount(userId);
  return Math.max(0, AppConfig.maxPostsPerDay - count);
}

export async function createPost(input: {
  userId: string;
  localImageUri: string;
  caption: string;
  bodyParts: BodyPartKey[];
  exercises?: ExerciseInput[];
  mentionedUserIds?: string[];
}): Promise<Post> {
  const caption = input.caption.trim();
  if (caption.length > AppConfig.post.captionMaxLength) {
    throw new Error(
      `ひとことは${AppConfig.post.captionMaxLength}文字以内にしてください`,
    );
  }

  const bodyParts = Array.from(new Set(input.bodyParts));
  if (bodyParts.length === 0) {
    throw new Error('トレーニング部位を選んでください');
  }
  if (bodyParts.length > AppConfig.post.maxBodyParts) {
    throw new Error(`部位は${AppConfig.post.maxBodyParts}つまでです`);
  }

  const mentionIds = Array.from(
    new Set((input.mentionedUserIds ?? []).filter((id) => id !== input.userId)),
  );
  if (mentionIds.length > AppConfig.post.maxMentions) {
    throw new Error(
      `一緒にトレーニングした人は${AppConfig.post.maxMentions}人までです`,
    );
  }

  const remaining = await getRemainingPostsToday(input.userId);
  if (remaining <= 0) {
    throw new Error('今日の投稿は2回までです');
  }

  const uuid = createUuid();
  const postedAt = new Date();
  const dailyEvent = await getTodayDailyEvent();

  let timingStatus: Post['timing_status'] = null;
  if (dailyEvent) {
    timingStatus = getTimingStatus(dailyEvent.notification_time, postedAt);
  }

  let imageUrl: string;
  try {
    imageUrl = await uploadPostImage(input.userId, uuid, input.localImageUri);
  } catch {
    throw new Error('写真のアップロードに失敗しました');
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      id: uuid,
      user_id: input.userId,
      image_url: imageUrl,
      caption,
      posted_at: postedAt.toISOString(),
      daily_event_id: dailyEvent?.id ?? null,
      timing_status: timingStatus,
    })
    .select()
    .single();

  if (error) {
    await deletePostImage(input.userId, uuid).catch(() => undefined);
    throw new Error(mapPostError(error.message));
  }

  try {
    await createWorkoutForPost({
      postId: data.id,
      bodyParts,
      exercises: input.exercises,
      participantIds: mentionIds,
    });
  } catch (workoutError) {
    await supabase.from('posts').delete().eq('id', data.id);
    await deletePostImage(input.userId, uuid).catch(() => undefined);
    throw workoutError instanceof Error
      ? workoutError
      : new Error('トレーニング記録の保存に失敗しました');
  }

  if (mentionIds.length > 0) {
    const { error: mentionError } = await supabase.from('post_mentions').insert(
      mentionIds.map((mentioned_user_id) => ({
        post_id: data.id,
        mentioned_user_id,
      })),
    );

    if (mentionError) {
      await supabase.from('posts').delete().eq('id', data.id);
      await deletePostImage(input.userId, uuid).catch(() => undefined);
      throw new Error(mapPostError(mentionError.message));
    }
  }

  return data;
}

export async function deletePost(post: Post): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', post.id);
  if (error) {
    throw new Error('投稿の削除に失敗しました');
  }
  await deletePostImage(post.user_id, post.id).catch(() => undefined);
}

function toFeedPost(
  row: {
    id: string;
    user_id: string;
    image_url: string;
    caption: string;
    posted_at: string;
    daily_event_id: string | null;
    timing_status: Post['timing_status'];
    pin_order: number | null;
    created_at: string;
    profile: unknown;
    reactions: unknown;
    post_mentions?: unknown;
    post_comments?: { count: number }[] | null;
    workouts?: unknown;
  },
  currentUserId: string,
): FeedPost {
  const profile = row.profile as unknown as Profile;
  const reactions = (row.reactions as unknown as Reaction[]) ?? [];
  const my = reactions.find((r) => r.user_id === currentUserId);
  const commentCount = Array.isArray(row.post_comments)
    ? (row.post_comments[0]?.count ?? 0)
    : 0;

  const workoutRaw = Array.isArray(row.workouts)
    ? row.workouts[0]
    : row.workouts;

  return {
    id: row.id,
    user_id: row.user_id,
    image_url: row.image_url,
    caption: row.caption,
    posted_at: row.posted_at,
    daily_event_id: row.daily_event_id,
    timing_status: row.timing_status,
    pin_order: row.pin_order ?? null,
    created_at: row.created_at,
    profile,
    reactions,
    myReaction: my?.reaction_type ?? null,
    mentions: mapMentions(row.post_mentions),
    commentCount,
    workout: mapWorkoutRow(workoutRaw),
  };
}

const FEED_SELECT = `
  *,
  profile:profiles!posts_user_id_fkey(*),
  reactions(*),
  post_mentions(
    mentioned_user_id,
    profile:profiles!post_mentions_mentioned_user_id_fkey(
      id, username, display_name, avatar_url
    )
  ),
  post_comments(count),
  workouts(
    id,
    trained_at,
    post_id,
    body_parts:workout_body_parts(body_part),
    exercises:workout_exercises(exercise_name, sort_order, sets, reps, weight_kg),
    participants:workout_participants(
      user_id,
      profile:profiles!workout_participants_user_id_fkey(
        id, username, display_name, avatar_url
      )
    )
  )
`;

export async function fetchFeed(currentUserId: string, limit = 30): Promise<FeedPost[]> {
  const { data: posts, error } = await supabase
    .from('posts')
    .select(FEED_SELECT)
    .order('posted_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error('フィードの取得に失敗しました');
  }

  return (posts ?? []).map((row) => toFeedPost(row, currentUserId));
}

export async function fetchPostById(
  postId: string,
  currentUserId: string,
): Promise<FeedPost | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(FEED_SELECT)
    .eq('id', postId)
    .maybeSingle();

  if (error) {
    throw new Error('投稿の取得に失敗しました');
  }
  if (!data) return null;

  return toFeedPost(data, currentUserId);
}

export async function fetchUserPosts(userId: string, limit = 30): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', userId)
    .order('posted_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error('投稿履歴の取得に失敗しました');
  }

  return data ?? [];
}

/** @deprecated 互換用。残り回数は getRemainingPostsToday を使う */
export async function hasPostedToday(userId: string): Promise<boolean> {
  const remaining = await getRemainingPostsToday(userId);
  return remaining <= 0;
}

export async function getMonthlyPostCount(userId: string): Promise<number> {
  const now = new Date();
  const start = new Date(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: AppConfig.timezone,
      year: 'numeric',
      month: '2-digit',
    }).format(now) + '-01T00:00:00+09:00',
  );

  const { count, error } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('posted_at', start.toISOString());

  if (error) return 0;
  return count ?? 0;
}

export async function upsertReaction(
  postId: string,
  userId: string,
  reactionType: ReactionType,
): Promise<void> {
  const { data: existing } = await supabase
    .from('reactions')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing?.reaction_type === reactionType) {
    const { error } = await supabase.from('reactions').delete().eq('id', existing.id);
    if (error) throw new Error('リアクションの削除に失敗しました');
    return;
  }

  if (existing) {
    const { error } = await supabase
      .from('reactions')
      .update({ reaction_type: reactionType })
      .eq('id', existing.id);
    if (error) throw new Error('リアクションの更新に失敗しました');
    return;
  }

  const { error } = await supabase.from('reactions').insert({
    post_id: postId,
    user_id: userId,
    reaction_type: reactionType,
  });

  if (error) throw new Error('リアクションに失敗しました');
}

export async function fetchPinnedPosts(userId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', userId)
    .not('pin_order', 'is', null)
    .order('pin_order', { ascending: true });

  if (error) {
    throw new Error('ピン留め投稿の取得に失敗しました');
  }

  return data ?? [];
}

export async function fetchWeeklyPostedAts(
  userId: string,
  sinceIso: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('posted_at')
    .eq('user_id', userId)
    .gte('posted_at', sinceIso);

  if (error) {
    throw new Error('週間投稿の取得に失敗しました');
  }

  return (data ?? []).map((row) => row.posted_at);
}

export async function pinPost(userId: string, postId: string): Promise<void> {
  const pinned = await fetchPinnedPosts(userId);
  if (pinned.some((p) => p.id === postId)) {
    return;
  }
  if (pinned.length >= 3) {
    throw new Error('ピン留めできる投稿は3件までです');
  }

  const used = new Set(pinned.map((p) => p.pin_order).filter(Boolean));
  let order = 1;
  while (used.has(order) && order <= 3) order += 1;

  const { error } = await supabase
    .from('posts')
    .update({ pin_order: order })
    .eq('id', postId)
    .eq('user_id', userId);

  if (error) {
    throw new Error('ピン留めに失敗しました');
  }
}

export async function unpinPost(userId: string, postId: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .update({ pin_order: null })
    .eq('id', postId)
    .eq('user_id', userId);

  if (error) {
    throw new Error('ピン留めの解除に失敗しました');
  }
}
