import { supabase } from '@/lib/supabase';
import type { Friendship, FriendshipStatus, Profile } from '@/types/database';

export type FriendshipWithProfile = Friendship & {
  requester: Profile;
  addressee: Profile;
};

export type FriendListItem = {
  friendshipId: string;
  friend: Profile;
  since: string;
};

export type SearchResultItem = {
  profile: Profile;
  relation: 'none' | 'friends' | 'outgoing' | 'incoming' | 'self';
  friendshipId?: string;
};

function mapFriendsError(message: string): string {
  if (message.includes('friendships_unique_pair') || message.includes('duplicate')) {
    return 'すでに申請済み、または友達です';
  }
  if (message.includes('friendships_no_self')) {
    return '自分自身には申請できません';
  }
  return '友達機能でエラーが発生しました。もう一度お試しください';
}

/**
 * username 部分一致検索（自分自身は除外）
 */
export async function searchUsers(
  query: string,
  currentUserId: string,
): Promise<SearchResultItem[]> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${trimmed}%`)
    .neq('id', currentUserId)
    .limit(20);

  if (error) {
    throw new Error('ユーザー検索に失敗しました');
  }

  if (!profiles || profiles.length === 0) {
    return [];
  }

  const ids = new Set(profiles.map((p) => p.id));

  const { data: friendships, error: friendshipError } = await supabase
    .from('friendships')
    .select('*')
    .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);

  if (friendshipError) {
    throw new Error('友達関係の取得に失敗しました');
  }

  const relevant = (friendships ?? []).filter(
    (f) => ids.has(f.requester_id) || ids.has(f.addressee_id),
  );

  return profiles.map((profile) => {
    const friendship = relevant.find(
      (f) =>
        (f.requester_id === currentUserId && f.addressee_id === profile.id) ||
        (f.addressee_id === currentUserId && f.requester_id === profile.id),
    );

    if (!friendship) {
      return { profile, relation: 'none' as const };
    }

    if (friendship.status === 'accepted') {
      return {
        profile,
        relation: 'friends' as const,
        friendshipId: friendship.id,
      };
    }

    if (friendship.status === 'pending') {
      if (friendship.requester_id === currentUserId) {
        return {
          profile,
          relation: 'outgoing' as const,
          friendshipId: friendship.id,
        };
      }
      return {
        profile,
        relation: 'incoming' as const,
        friendshipId: friendship.id,
      };
    }

    // rejected は再申請可能扱いにする
    return { profile, relation: 'none' as const };
  });
}

export async function sendFriendRequest(
  currentUserId: string,
  addresseeId: string,
): Promise<Friendship> {
  if (currentUserId === addresseeId) {
    throw new Error('自分自身には申請できません');
  }

  // 既存関係を確認（逆方向の pending / accepted も含む）
  const { data: existing } = await supabase
    .from('friendships')
    .select('*')
    .or(
      `and(requester_id.eq.${currentUserId},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${currentUserId})`,
    )
    .maybeSingle();

  if (existing) {
    if (existing.status === 'accepted') {
      throw new Error('すでに友達です');
    }
    if (existing.status === 'pending') {
      throw new Error('すでに申請済みです');
    }
    // rejected → 古いレコードを消して再申請
    const { error: deleteError } = await supabase
      .from('friendships')
      .delete()
      .eq('id', existing.id);

    if (deleteError) {
      throw new Error(mapFriendsError(deleteError.message));
    }
  }

  const { data, error } = await supabase
    .from('friendships')
    .insert({
      requester_id: currentUserId,
      addressee_id: addresseeId,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    throw new Error(mapFriendsError(error.message));
  }

  return data;
}

export async function respondToFriendRequest(
  friendshipId: string,
  status: Extract<FriendshipStatus, 'accepted' | 'rejected'>,
): Promise<Friendship> {
  const { data, error } = await supabase
    .from('friendships')
    .update({ status })
    .eq('id', friendshipId)
    .select()
    .single();

  if (error) {
    throw new Error(
      status === 'accepted'
        ? '友達申請の承認に失敗しました'
        : '友達申請の拒否に失敗しました',
    );
  }

  return data;
}

export async function removeFriendship(friendshipId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId);

  if (error) {
    throw new Error('友達関係の削除に失敗しました');
  }
}

/**
 * 承認済みの友達一覧
 */
export async function fetchFriends(currentUserId: string): Promise<FriendListItem[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(
      `
      id,
      requester_id,
      addressee_id,
      status,
      created_at,
      updated_at,
      requester:profiles!friendships_requester_id_fkey(*),
      addressee:profiles!friendships_addressee_id_fkey(*)
    `,
    )
    .eq('status', 'accepted')
    .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error('友達一覧の取得に失敗しました');
  }

  return (data ?? []).map((row) => {
    const requester = row.requester as unknown as Profile;
    const addressee = row.addressee as unknown as Profile;
    const friend = row.requester_id === currentUserId ? addressee : requester;

    return {
      friendshipId: row.id,
      friend,
      since: row.updated_at,
    };
  });
}

/**
 * 自分宛の未承認申請
 */
export async function fetchIncomingRequests(
  currentUserId: string,
): Promise<FriendshipWithProfile[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(
      `
      id,
      requester_id,
      addressee_id,
      status,
      created_at,
      updated_at,
      requester:profiles!friendships_requester_id_fkey(*),
      addressee:profiles!friendships_addressee_id_fkey(*)
    `,
    )
    .eq('addressee_id', currentUserId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('友達申請の取得に失敗しました');
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    requester_id: row.requester_id,
    addressee_id: row.addressee_id,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    requester: row.requester as unknown as Profile,
    addressee: row.addressee as unknown as Profile,
  }));
}

/**
 * 自分が送った未承認申請
 */
export async function fetchOutgoingRequests(
  currentUserId: string,
): Promise<FriendshipWithProfile[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(
      `
      id,
      requester_id,
      addressee_id,
      status,
      created_at,
      updated_at,
      requester:profiles!friendships_requester_id_fkey(*),
      addressee:profiles!friendships_addressee_id_fkey(*)
    `,
    )
    .eq('requester_id', currentUserId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('送信済み申請の取得に失敗しました');
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    requester_id: row.requester_id,
    addressee_id: row.addressee_id,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    requester: row.requester as unknown as Profile,
    addressee: row.addressee as unknown as Profile,
  }));
}

/**
 * 特定ユーザーとの友達関係（招待画面などで使用）
 */
export async function getRelationWithUser(
  currentUserId: string,
  otherUserId: string,
): Promise<'none' | 'friends' | 'outgoing' | 'incoming'> {
  if (currentUserId === otherUserId) return 'none';

  const { data } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id, status')
    .or(
      `and(requester_id.eq.${currentUserId},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${currentUserId})`,
    )
    .maybeSingle();

  if (!data) return 'none';
  if (data.status === 'accepted') return 'friends';
  if (data.status === 'pending') {
    return data.requester_id === currentUserId ? 'outgoing' : 'incoming';
  }
  return 'none';
}

export async function countFriends(currentUserId: string): Promise<number> {
  const { count, error } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'accepted')
    .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);

  if (error) {
    return 0;
  }

  return count ?? 0;
}
