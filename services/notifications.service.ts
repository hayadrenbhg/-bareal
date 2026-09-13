import { supabase } from '@/lib/supabase';
import type { AppNotification, Profile } from '@/types/database';

export type NotificationItem = AppNotification & {
  actor: Profile | null;
};

export async function fetchNotifications(userId: string): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(
      `
      *,
      actor:profiles!notifications_actor_id_fkey(*)
    `,
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error('通知の取得に失敗しました');
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    actor_id: row.actor_id,
    type: row.type,
    post_id: row.post_id,
    friendship_id: row.friendship_id,
    message: row.message,
    read_at: row.read_at,
    created_at: row.created_at,
    actor: (row.actor as unknown as Profile) ?? null,
  }));
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
}

export async function upsertPushToken(input: {
  userId: string;
  token: string;
  deviceId?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('user_push_tokens').upsert(
    {
      user_id: input.userId,
      expo_push_token: input.token,
      device_id: input.deviceId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'expo_push_token' },
  );

  if (error) {
    throw new Error('プッシュトークンの保存に失敗しました');
  }
}

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase.from('blocks').insert({
    blocker_id: blockerId,
    blocked_id: blockedId,
  });

  if (error) {
    if (error.message.includes('duplicate')) {
      throw new Error('すでにブロック済みです');
    }
    throw new Error('ブロックに失敗しました');
  }

  // 友達関係があれば削除
  await supabase
    .from('friendships')
    .delete()
    .or(
      `and(requester_id.eq.${blockerId},addressee_id.eq.${blockedId}),and(requester_id.eq.${blockedId},addressee_id.eq.${blockerId})`,
    );
}

export async function reportContent(input: {
  reporterId: string;
  reportedUserId?: string | null;
  postId?: string | null;
  reason: string;
}): Promise<void> {
  const { error } = await supabase.from('reports').insert({
    reporter_id: input.reporterId,
    reported_user_id: input.reportedUserId ?? null,
    post_id: input.postId ?? null,
    reason: input.reason.trim(),
  });

  if (error) {
    throw new Error('通報の送信に失敗しました');
  }
}
