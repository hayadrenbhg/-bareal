import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import { Share } from 'react-native';

import { supabase } from '@/lib/supabase';
import { extractInviteTokenFromPayload } from '@/utils/invite-token';

const PENDING_INVITE_KEY = 'be-reach:pendingInviteToken';
const DEFAULT_EXPIRES_DAYS = 30;

export type InvitePreview = {
  token: string;
  inviterId: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isValid: boolean;
  reason: string | null;
};

export type AcceptInviteResult = {
  ok: boolean;
  status:
    | 'accepted'
    | 'already_friends'
    | 'invalid'
    | 'expired'
    | 'self'
    | 'unauthenticated'
    | 'rate_limited'
    | string;
  friendshipId?: string;
};

export type InviteLinkUrls = {
  token: string;
  url: string;
  shareUrl: string;
};

export { extractInviteTokenFromPayload } from '@/utils/invite-token';

/** QR に埋め込む招待 URL（アプリ内スキャンでも外部カメラでも使える） */
export function buildInviteQrValue(urls: InviteLinkUrls): string {
  return urls.shareUrl;
}

function mapPreviewRow(row: {
  token: string;
  inviter_id: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_valid: boolean;
  reason: string | null;
}): InvitePreview {
  return {
    token: row.token,
    inviterId: row.inviter_id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    isValid: row.is_valid,
    reason: row.reason,
  };
}

function toUrls(token: string): InviteLinkUrls {
  const deepLink = Linking.createURL(`invite/${token}`);
  const webStyle = `https://bereach.app/invite/${token}`;
  return { token, url: deepLink, shareUrl: webStyle };
}

function mapInviteRpcError(message: string): Error {
  if (message.includes('rate_limited')) {
    return new Error('操作が多すぎます。しばらくしてから再試行してください');
  }
  if (message.includes('unauthenticated')) {
    return new Error('ログインが必要です');
  }
  return new Error('招待リンクの処理に失敗しました');
}

export async function savePendingInviteToken(token: string): Promise<void> {
  await AsyncStorage.setItem(PENDING_INVITE_KEY, token);
}

export async function getPendingInviteToken(): Promise<string | null> {
  return AsyncStorage.getItem(PENDING_INVITE_KEY);
}

export async function clearPendingInviteToken(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_INVITE_KEY);
}

/** クライアント側フォールバック用（通常は DB RPC が token を生成） */
export async function createSecureInviteToken(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 有効な招待リンクを返す。なければ作成（期限 30 日）。
 * RPC が未デプロイの場合はクライアント生成にフォールバック。
 */
export async function getOrCreateInviteLink(
  userId: string,
): Promise<InviteLinkUrls> {
  const { data, error } = await supabase.rpc('get_or_create_invite_link', {
    p_expires_days: DEFAULT_EXPIRES_DAYS,
  });

  if (!error) {
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.token) {
      return toUrls(row.token as string);
    }
  }

  if (error) {
    if (
      error.message.includes('rate_limited') ||
      error.message.includes('unauthenticated')
    ) {
      throw mapInviteRpcError(error.message);
    }
    // 関数未デプロイ時のみフォールバック
    if (!/Could not find the function|PGRST202/i.test(error.message)) {
      throw mapInviteRpcError(error.message);
    }
  }

  return createInviteLinkClient(userId);
}

async function createInviteLinkClient(userId: string): Promise<InviteLinkUrls> {
  const { data: existing } = await supabase
    .from('invite_links')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const stillValid =
    existing?.token &&
    (existing.expires_at == null || new Date(existing.expires_at) > new Date());

  if (stillValid && existing?.token) {
    return toUrls(existing.token);
  }

  if (existing?.id) {
    await supabase
      .from('invite_links')
      .update({ is_active: false })
      .eq('id', existing.id);
  }

  const token = await createSecureInviteToken();
  const expires = new Date();
  expires.setDate(expires.getDate() + DEFAULT_EXPIRES_DAYS);

  const { error } = await supabase.from('invite_links').insert({
    user_id: userId,
    token,
    expires_at: expires.toISOString(),
    is_active: true,
  });

  if (error) {
    throw new Error('招待リンクの作成に失敗しました');
  }

  return toUrls(token);
}

/** 旧リンクを無効化して再発行 */
export async function regenerateInviteLink(
  userId: string,
): Promise<InviteLinkUrls> {
  const { data, error } = await supabase.rpc('regenerate_invite_link', {
    p_expires_days: DEFAULT_EXPIRES_DAYS,
  });

  if (!error) {
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.token) {
      return toUrls(row.token as string);
    }
  }

  if (error && !error.message.includes('Could not find the function')) {
    throw mapInviteRpcError(error.message);
  }

  await supabase
    .from('invite_links')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true);

  return createInviteLinkClient(userId);
}

export async function fetchInvitePreview(token: string): Promise<InvitePreview> {
  const { data, error } = await supabase.rpc('get_invite_preview', {
    p_token: token,
  });

  if (error) {
    throw new Error('招待情報の取得に失敗しました');
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return {
      token,
      inviterId: null,
      username: null,
      displayName: null,
      avatarUrl: null,
      isValid: false,
      reason: 'not_found',
    };
  }

  return mapPreviewRow(row);
}

export async function acceptInvite(token: string): Promise<AcceptInviteResult> {
  const { data, error } = await supabase.rpc('accept_invite', {
    p_token: token,
  });

  if (error) {
    if (error.message.includes('rate_limited')) {
      return { ok: false, status: 'rate_limited' };
    }
    throw new Error('友達追加に失敗しました');
  }

  const result = data as {
    ok?: boolean;
    status?: string;
    friendship_id?: string;
  };

  return {
    ok: !!result?.ok,
    status: result?.status ?? 'invalid',
    friendshipId: result?.friendship_id,
  };
}

export async function shareInviteLink(userId: string): Promise<void> {
  const { url, shareUrl } = await getOrCreateInviteLink(userId);
  const message = `Be Reachでつながろう！\n${shareUrl}\n\n（アプリで開く場合）\n${url}`;
  await Share.share({ message, url });
}

/** 招待リンクをクリップボードへ（Web形式 + Expo Go 用 deep link） */
export async function copyInviteLink(userId: string): Promise<InviteLinkUrls> {
  const urls = await getOrCreateInviteLink(userId);
  await Clipboard.setStringAsync(`${urls.shareUrl}\n${urls.url}`);
  return urls;
}

/** 認証完了後の遷移先（pending invite があれば招待画面へ） */
export async function getPostAuthRedirectPath(): Promise<string> {
  const token = await getPendingInviteToken();
  if (token) {
    return `/invite/${token}`;
  }
  return '/(tabs)';
}
