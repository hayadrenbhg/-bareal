import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/layout/EmptyState';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Form';
import Colors, { Brand } from '@/constants/Colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useAuth } from '@/hooks/useAuth';
import { getRelationWithUser } from '@/services/friends.service';
import {
  acceptInvite,
  clearPendingInviteToken,
  fetchInvitePreview,
  savePendingInviteToken,
  type InvitePreview,
} from '@/services/invite.service';

type Relation = 'none' | 'friends' | 'outgoing' | 'incoming' | 'self';
type ScreenStatus =
  | 'loading'
  | 'ready'
  | 'invalid'
  | 'done'
  | 'need_auth';

export default function InviteScreen() {
  const colors = Colors.dark;
  const { session, user, profile, loading: authLoading } = useAuth();
  const params = useLocalSearchParams<{ token: string }>();
  const token = typeof params.token === 'string' ? params.token : '';

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [relation, setRelation] = useState<Relation>('none');
  const [status, setStatus] = useState<ScreenStatus>('loading');
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    setStatus('loading');
    await savePendingInviteToken(token);

    try {
      const data = await fetchInvitePreview(token);
      setPreview(data);

      if (!data.isValid) {
        setStatus('invalid');
        return;
      }

      if (!session || !user) {
        setStatus('need_auth');
        return;
      }

      if (profile && !profile.onboarding_completed) {
        setStatus('need_auth');
        router.replace('/(auth)/register/profile');
        return;
      }

      if (data.inviterId === user.id) {
        setRelation('self');
        setStatus('ready');
        return;
      }

      if (data.inviterId) {
        const rel = await getRelationWithUser(user.id, data.inviterId);
        setRelation(rel);
      }

      setStatus('ready');
    } catch {
      setStatus('invalid');
    }
  }, [token, session, user, profile]);

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [authLoading, load]);

  const handleAddFriend = async () => {
    if (!token) return;
    setActionLoading(true);
    try {
      const result = await acceptInvite(token);
      await clearPendingInviteToken();

      if (result.status === 'self') {
        setRelation('self');
        setStatusMessage('自分自身を友達に追加することはできません');
        return;
      }

      if (result.status === 'invalid' || result.status === 'expired') {
        setStatus('invalid');
        return;
      }

      if (result.status === 'rate_limited') {
        setStatusMessage('操作が多すぎます。しばらくしてから再試行してください');
        return;
      }

      if (result.status === 'already_friends' || result.status === 'accepted') {
        setRelation('friends');
        setStatus('done');
        setStatusMessage(
          result.status === 'already_friends'
            ? 'すでに友達です'
            : '友達になりました',
        );
        return;
      }

      setStatusMessage('友達追加に失敗しました');
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : '友達追加に失敗しました',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const goLogin = () => {
    router.replace('/(auth)/login');
  };

  const goRegister = () => {
    router.replace('/(auth)/register');
  };

  const goHome = () => {
    router.replace('/(tabs)');
  };

  if (authLoading || status === 'loading') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Brand.accent} />
      </View>
    );
  }

  if (status === 'invalid') {
    return (
      <ScreenWrapper>
        <EmptyState
          title="この招待リンクは使用できません"
          message="リンクの期限切れ、または無効な可能性があります"
        />
        <View style={styles.footer}>
          <Button title="ホームへ" onPress={goHome} variant="secondary" />
        </View>
      </ScreenWrapper>
    );
  }

  const name =
    preview?.displayName?.trim() ||
    (preview?.username ? `@${preview.username}` : 'ユーザー');

  if (status === 'need_auth') {
    return (
      <ScreenWrapper>
        <View style={styles.content}>
          <Avatar
            uri={preview?.avatarUrl}
            name={preview?.username ?? undefined}
            size={96}
          />
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          {preview?.username ? (
            <Text style={[styles.username, { color: colors.textSecondary }]}>
              @{preview.username}
            </Text>
          ) : null}
          <Text style={[styles.prompt, { color: colors.text }]}>
            Be Reachで友達になりませんか？
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            ログインまたは新規登録後に追加できます
          </Text>
          <View style={styles.actions}>
            <Button title="ログイン" onPress={goLogin} />
            <Button title="新規登録" onPress={goRegister} variant="secondary" />
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  const showAdd =
    relation === 'none' || relation === 'incoming' || relation === 'outgoing';

  return (
    <ScreenWrapper>
      <View style={styles.content}>
        <Avatar
          uri={preview?.avatarUrl}
          name={preview?.username ?? undefined}
          size={96}
        />
        <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
        {preview?.username ? (
          <Text style={[styles.username, { color: colors.textSecondary }]}>
            @{preview.username}
          </Text>
        ) : null}

        {relation === 'self' ? (
          <Text style={[styles.prompt, { color: colors.textSecondary }]}>
            自分自身を友達に追加することはできません
          </Text>
        ) : null}

        {relation === 'friends' || status === 'done' ? (
          <Text style={[styles.prompt, { color: colors.success }]}>
            {statusMessage ?? 'すでに友達です'}
          </Text>
        ) : null}

        {relation === 'outgoing' && status !== 'done' ? (
          <Text style={[styles.prompt, { color: colors.textSecondary }]}>
            友達申請済みです
          </Text>
        ) : null}

        {showAdd && relation !== 'outgoing' ? (
          <>
            <Text style={[styles.prompt, { color: colors.text }]}>
              Be Reachで友達になりませんか？
            </Text>
            <View style={styles.actions}>
              <Button
                title="友達に追加"
                loading={actionLoading}
                onPress={handleAddFriend}
              />
            </View>
          </>
        ) : null}

        {relation === 'outgoing' && status !== 'done' ? (
          <View style={styles.actions}>
            <Button
              title="招待を承認して友達になる"
              loading={actionLoading}
              onPress={handleAddFriend}
            />
          </View>
        ) : null}

        {statusMessage && relation !== 'friends' && status !== 'done' ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {statusMessage}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Button title="ホームへ" onPress={goHome} variant="secondary" />
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.sm,
  },
  name: {
    marginTop: Spacing.lg,
    fontSize: FontSize.title,
    fontWeight: '700',
    textAlign: 'center',
  },
  username: {
    fontSize: FontSize.body,
    textAlign: 'center',
  },
  prompt: {
    marginTop: Spacing.xl,
    fontSize: FontSize.bodyLarge,
    fontWeight: '600',
    textAlign: 'center',
  },
  hint: {
    marginTop: Spacing.sm,
    fontSize: FontSize.caption,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  footer: {
    width: '100%',
    marginTop: Spacing.xxl,
  },
});
