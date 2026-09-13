import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { EmptyState } from '@/components/layout/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { useColorScheme } from '@/components/useColorScheme';
import Colors, { Brand } from '@/constants/Colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchFriends,
  fetchIncomingRequests,
  fetchOutgoingRequests,
  removeFriendship,
  respondToFriendRequest,
  searchUsers,
  sendFriendRequest,
  type FriendListItem,
  type FriendshipWithProfile,
  type SearchResultItem,
} from '@/services/friends.service';
import {
  copyInviteLink,
  regenerateInviteLink,
  shareInviteLink,
} from '@/services/invite.service';

type TabKey = 'friends' | 'requests' | 'search';

export default function FriendsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { user } = useAuth();

  const [tab, setTab] = useState<TabKey>('friends');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [incoming, setIncoming] = useState<FriendshipWithProfile[]>([]);
  const [outgoing, setOutgoing] = useState<FriendshipWithProfile[]>([]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);

  const handleShareInvite = async () => {
    if (!user || inviteBusy) return;
    setInviteBusy(true);
    try {
      await shareInviteLink(user.id);
    } catch (error) {
      Alert.alert(
        '共有エラー',
        error instanceof Error ? error.message : '招待リンクの共有に失敗しました',
      );
    } finally {
      setInviteBusy(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!user || inviteBusy) return;
    setInviteBusy(true);
    try {
      await copyInviteLink(user.id);
      Alert.alert('コピーしました', '招待リンクをクリップボードにコピーしました');
    } catch (error) {
      Alert.alert(
        'コピーエラー',
        error instanceof Error ? error.message : 'リンクのコピーに失敗しました',
      );
    } finally {
      setInviteBusy(false);
    }
  };

  const handleRegenerateInvite = () => {
    if (!user || inviteBusy) return;
    Alert.alert(
      '招待リンクを再生成',
      '古いリンクは無効になります。よろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '再生成',
          style: 'destructive',
          onPress: async () => {
            setInviteBusy(true);
            try {
              await regenerateInviteLink(user.id);
              Alert.alert('完了', '新しい招待リンクを発行しました');
            } catch (error) {
              Alert.alert(
                '再生成エラー',
                error instanceof Error
                  ? error.message
                  : '招待リンクの再生成に失敗しました',
              );
            } finally {
              setInviteBusy(false);
            }
          },
        },
      ],
    );
  };

  const loadLists = useCallback(async () => {
    if (!user) return;

    try {
      const [friendsData, incomingData, outgoingData] = await Promise.all([
        fetchFriends(user.id),
        fetchIncomingRequests(user.id),
        fetchOutgoingRequests(user.id),
      ]);
      setFriends(friendsData);
      setIncoming(incomingData);
      setOutgoing(outgoingData);
    } catch (error) {
      Alert.alert(
        '読み込みエラー',
        error instanceof Error ? error.message : '友達情報の取得に失敗しました',
      );
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    loadLists().finally(() => setLoading(false));
  }, [loadLists]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLists();
    if (tab === 'search' && query.trim() && user) {
      try {
        const results = await searchUsers(query, user.id);
        setSearchResults(results);
      } catch {
        // 検索失敗は一覧 refresh を優先
      }
    }
    setRefreshing(false);
  };

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (!user) return;

    const trimmed = text.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchUsers(trimmed, user.id);
      setSearchResults(results);
    } catch (error) {
      Alert.alert(
        '検索エラー',
        error instanceof Error ? error.message : '検索に失敗しました',
      );
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (addresseeId: string) => {
    if (!user) return;
    setActionLoadingId(addresseeId);
    try {
      await sendFriendRequest(user.id, addresseeId);
      const results = await searchUsers(query, user.id);
      setSearchResults(results);
      await loadLists();
    } catch (error) {
      Alert.alert(
        '申請エラー',
        error instanceof Error ? error.message : '申請に失敗しました',
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRespond = async (
    friendshipId: string,
    status: 'accepted' | 'rejected',
  ) => {
    setActionLoadingId(friendshipId);
    try {
      await respondToFriendRequest(friendshipId, status);
      await loadLists();
    } catch (error) {
      Alert.alert(
        'エラー',
        error instanceof Error ? error.message : '処理に失敗しました',
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemove = (friendshipId: string, label: string) => {
    Alert.alert(label, '本当に解除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '解除する',
        style: 'destructive',
        onPress: async () => {
          setActionLoadingId(friendshipId);
          try {
            await removeFriendship(friendshipId);
            await loadLists();
            if (query.trim() && user) {
              setSearchResults(await searchUsers(query, user.id));
            }
          } catch (error) {
            Alert.alert(
              'エラー',
              error instanceof Error ? error.message : '削除に失敗しました',
            );
          } finally {
            setActionLoadingId(null);
          }
        },
      },
    ]);
  };

  const tabs: { key: TabKey; label: string; badge?: number }[] = [
    { key: 'friends', label: '友達' },
    {
      key: 'requests',
      label: '申請',
      badge: incoming.length > 0 ? incoming.length : undefined,
    },
    { key: 'search', label: '検索' },
  ];

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {tabs.map((item) => {
          const active = tab === item.key;
          return (
            <Pressable
              key={item.key}
              style={styles.tabButton}
              onPress={() => setTab(item.key)}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? colors.tint : colors.textSecondary },
                ]}
              >
                {item.label}
                {item.badge ? ` (${item.badge})` : ''}
              </Text>
              {active ? (
                <View style={[styles.tabUnderline, { backgroundColor: Brand.accent }]} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {tab === 'friends' ? (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.friendshipId}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
          }
          contentContainerStyle={friends.length === 0 ? styles.flexGrow : styles.listContent}
          ListEmptyComponent={<EmptyState title="まだ友達がいません" message="検索から追加できます" />}
          renderItem={({ item }) => (
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <Avatar
                uri={item.friend.avatar_url}
                name={item.friend.username}
                size={48}
              />
              <View style={styles.rowBody}>
                <Text style={[styles.username, { color: colors.text }]}>
                  @{item.friend.username}
                </Text>
                {item.friend.display_name ? (
                  <Text style={[styles.meta, { color: colors.textSecondary }]}>
                    {item.friend.display_name}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/user/[id]', params: { id: item.friend.id } })
                }
                style={[styles.ghostButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.ghostButtonText, { color: colors.textSecondary }]}>
                  見る
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleRemove(item.friendshipId, '友達解除')}
                disabled={actionLoadingId === item.friendshipId}
                style={[styles.ghostButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.ghostButtonText, { color: colors.textSecondary }]}>
                  解除
                </Text>
              </Pressable>
            </View>
          )}
        />
      ) : null}

      {tab === 'requests' ? (
        <FlatList
          data={[...incoming, ...outgoing]}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
          }
          contentContainerStyle={
            incoming.length + outgoing.length === 0 ? styles.flexGrow : styles.listContent
          }
          ListEmptyComponent={<EmptyState title="申請はありません" />}
          renderItem={({ item }) => {
            const isIncoming = item.addressee_id === user?.id;
            const profile = isIncoming ? item.requester : item.addressee;

            return (
              <View style={[styles.row, { borderBottomColor: colors.border }]}>
                <Avatar
                  uri={profile.avatar_url}
                  name={profile.username}
                  size={48}
                />
                <View style={styles.rowBody}>
                  <Text style={[styles.username, { color: colors.text }]}>
                    @{profile.username}
                  </Text>
                  <Text style={[styles.meta, { color: colors.textSecondary }]}>
                    {isIncoming ? '友達申請が届いています' : '申請を送信済み'}
                  </Text>
                </View>

                {isIncoming ? (
                  <View style={styles.actionRow}>
                    <Pressable
                      style={[styles.primaryButton, { backgroundColor: Brand.accent }]}
                      disabled={actionLoadingId === item.id}
                      onPress={() => handleRespond(item.id, 'accepted')}
                    >
                      <Text style={styles.primaryButtonText}>承認</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.ghostButton, { borderColor: colors.border }]}
                      disabled={actionLoadingId === item.id}
                      onPress={() => handleRespond(item.id, 'rejected')}
                    >
                      <Text style={[styles.ghostButtonText, { color: colors.textSecondary }]}>
                        拒否
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={[styles.ghostButton, { borderColor: colors.border }]}
                    disabled={actionLoadingId === item.id}
                    onPress={() => handleRemove(item.id, '申請キャンセル')}
                  >
                    <Text style={[styles.ghostButtonText, { color: colors.textSecondary }]}>
                      取消
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      ) : null}

      {tab === 'search' ? (
        <View style={styles.flex}>
          <View style={styles.inviteBox}>
            <Text style={[styles.inviteTitle, { color: colors.text }]}>
              友達を招待
            </Text>
            <Text style={[styles.inviteHint, { color: colors.textSecondary }]}>
              LINEやInstagramで招待リンクを送る
            </Text>
            <Pressable
              style={[
                styles.inviteButton,
                { backgroundColor: Brand.accent },
                inviteBusy && styles.inviteButtonDisabled,
              ]}
              disabled={inviteBusy}
              onPress={handleShareInvite}
            >
              {inviteBusy ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.inviteButtonText}>招待リンクを共有</Text>
              )}
            </Pressable>
            <View style={styles.inviteSecondaryRow}>
              <Pressable
                style={[styles.inviteSecondaryButton, { borderColor: colors.border }]}
                disabled={inviteBusy}
                onPress={handleCopyInvite}
              >
                <Text style={[styles.inviteSecondaryText, { color: colors.text }]}>
                  リンクをコピー
                </Text>
              </Pressable>
              <Pressable
                style={[styles.inviteSecondaryButton, { borderColor: colors.border }]}
                disabled={inviteBusy}
                onPress={handleRegenerateInvite}
              >
                <Text
                  style={[styles.inviteSecondaryText, { color: colors.textSecondary }]}
                >
                  再生成
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.inviteBox}>
            <Text style={[styles.inviteTitle, { color: colors.text }]}>
              対面で追加
            </Text>
            <Text style={[styles.inviteHint, { color: colors.textSecondary }]}>
              QRコードを見せる・読み取る
            </Text>
            <Pressable
              style={[styles.inviteButton, { backgroundColor: Brand.accent }]}
              onPress={() => router.push('/invite/qr')}
            >
              <Text style={styles.inviteButtonText}>QRで友達追加</Text>
            </Pressable>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.searchBox}>
            <TextInput
              value={query}
              onChangeText={handleSearch}
              placeholder="ユーザー名で検索"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.searchInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />
          </View>

          {searching ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.tint} />
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.profile.id}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.tint}
                />
              }
              contentContainerStyle={
                query.trim() && searchResults.length === 0
                  ? styles.flexGrow
                  : styles.listContent
              }
              ListEmptyComponent={
                query.trim() ? (
                  <EmptyState title="見つかりませんでした" />
                ) : (
                  <EmptyState title="ユーザー名で検索" />
                )
              }
              renderItem={({ item }) => (
                <View style={[styles.row, { borderBottomColor: colors.border }]}>
                  <Avatar
                    uri={item.profile.avatar_url}
                    name={item.profile.username}
                    size={48}
                  />
                  <View style={styles.rowBody}>
                    <Text style={[styles.username, { color: colors.text }]}>
                      @{item.profile.username}
                    </Text>
                    {item.profile.display_name ? (
                      <Text style={[styles.meta, { color: colors.textSecondary }]}>
                        {item.profile.display_name}
                      </Text>
                    ) : null}
                  </View>

                  {item.relation === 'none' ? (
                    <Pressable
                      style={[styles.primaryButton, { backgroundColor: Brand.accent }]}
                      disabled={actionLoadingId === item.profile.id}
                      onPress={() => handleSendRequest(item.profile.id)}
                    >
                      <Text style={styles.primaryButtonText}>申請</Text>
                    </Pressable>
                  ) : null}

                  {item.relation === 'friends' ? (
                    <Text style={[styles.badge, { color: colors.success }]}>友達</Text>
                  ) : null}

                  {item.relation === 'outgoing' ? (
                    <Text style={[styles.badge, { color: colors.textSecondary }]}>申請中</Text>
                  ) : null}

                  {item.relation === 'incoming' && item.friendshipId ? (
                    <Pressable
                      style={[styles.primaryButton, { backgroundColor: Brand.accent }]}
                      disabled={actionLoadingId === item.friendshipId}
                      onPress={() => handleRespond(item.friendshipId!, 'accepted')}
                    >
                      <Text style={styles.primaryButtonText}>承認</Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  flexGrow: {
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  tabLabel: {
    fontSize: FontSize.body,
    fontWeight: '600',
  },
  tabUnderline: {
    marginTop: Spacing.sm,
    height: 2,
    width: 28,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  searchBox: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  inviteBox: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  inviteTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '700',
  },
  inviteHint: {
    fontSize: FontSize.caption,
    marginBottom: Spacing.xs,
  },
  inviteButton: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteButtonDisabled: {
    opacity: 0.7,
  },
  inviteButtonText: {
    color: '#FFF',
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  inviteSecondaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  inviteSecondaryButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteSecondaryText: {
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.lg,
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.bodyLarge,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  rowBody: {
    flex: 1,
  },
  username: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '600',
  },
  meta: {
    fontSize: FontSize.caption,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  primaryButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  ghostButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  ghostButtonText: {
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
  badge: {
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
});
