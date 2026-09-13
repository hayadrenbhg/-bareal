import * as ImagePicker from 'expo-image-picker';
import { router, Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Avatar } from '@/components/ui/Avatar';
import { Button, Input, TextArea } from '@/components/ui/Form';
import { AppConfig } from '@/constants/config';
import Colors, { Brand } from '@/constants/Colors';
import { WEEKLY_GOAL_OPTIONS } from '@/constants/training';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/hooks/useAuth';
import {
  updateProfile,
  updateProfileWithAvatar,
} from '@/services/profile.service';
import { validateBio, validateDisplayName } from '@/utils/validation';

export default function EditProfileScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const { user, profile, refreshProfile, signOut, deleteAccount } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [occupation, setOccupation] = useState('');
  const [instagram, setInstagram] = useState('');
  const [weeklyGoal, setWeeklyGoal] = useState<number | null>(null);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setBio(profile.bio ?? '');
      setOccupation(profile.occupation ?? '');
      setInstagram(profile.instagram_username ?? '');
      setWeeklyGoal(profile.weekly_workout_goal);
      setHeight(profile.height_cm != null ? String(profile.height_cm) : '');
      setWeight(profile.weight_kg != null ? String(profile.weight_kg) : '');
    }
  }, [profile]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        '権限が必要です',
        'プロフィール画像を設定するには、写真ライブラリへのアクセスを許可してください。',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    const displayNameResult = validateDisplayName(displayName);
    const bioResult = validateBio(bio);

    const newErrors: Record<string, string> = {};
    if (!displayNameResult.valid) newErrors.displayName = displayNameResult.message!;
    if (!bioResult.valid) newErrors.bio = bioResult.message!;

    const goalNum = weeklyGoal;
    if (goalNum != null && (goalNum < 1 || goalNum > 7)) {
      newErrors.weeklyGoal = '1〜7で選択してください';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const ig = instagram.trim().replace(/^@/, '') || null;
      const profileInput = {
        display_name: displayName.trim() || null,
        bio: bio.trim(),
        occupation: occupation.trim() || null,
        instagram_username: ig,
        weekly_workout_goal: goalNum,
        height_cm: height.trim() ? Number(height) : null,
        weight_kg: weight.trim() ? Number(weight) : null,
      };

      if (avatarUri) {
        await updateProfileWithAvatar(user.id, avatarUri, profileInput);
      } else {
        await updateProfile(user.id, profileInput);
      }

      await refreshProfile();
      router.back();
    } catch (error) {
      Alert.alert(
        '保存エラー',
        error instanceof Error ? error.message : 'プロフィールの保存に失敗しました',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'ログアウト',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'アカウントを削除',
      'プロフィール、投稿、コメント、友達関係がすべて削除されます。この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => {
            Alert.alert('最終確認', '本当にアカウントを削除しますか？', [
              { text: 'キャンセル', style: 'cancel' },
              {
                text: '削除する',
                style: 'destructive',
                onPress: async () => {
                  setDeleting(true);
                  try {
                    await deleteAccount();
                    router.replace('/(auth)/login');
                  } catch (error) {
                    Alert.alert(
                      '削除エラー',
                      error instanceof Error
                        ? error.message
                        : 'アカウントの削除に失敗しました',
                    );
                  } finally {
                    setDeleting(false);
                  }
                },
              },
            ]);
          },
        },
      ],
    );
  };

  const previewUri = avatarUri ?? profile?.avatar_url;

  return (
    <ScreenWrapper scroll>
      <View style={styles.avatarSection}>
        <Pressable onPress={pickImage}>
          <Avatar uri={previewUri} name={profile?.username} size={112} />
        </Pressable>
        <Text style={[styles.changePhoto, { color: colors.tint }]}>写真を変更</Text>
      </View>

      <Input
        label="表示名"
        value={displayName}
        onChangeText={setDisplayName}
        error={errors.displayName}
        placeholder="表示名"
        maxLength={AppConfig.profile.displayNameMaxLength}
      />

      <TextArea
        label={`自己紹介（${bio.length}/${AppConfig.profile.bioMaxLength}）`}
        value={bio}
        onChangeText={setBio}
        error={errors.bio}
        placeholder="短い自己紹介"
        maxLength={AppConfig.profile.bioMaxLength}
      />

      <Input
        label="職業・所属（任意）"
        value={occupation}
        onChangeText={setOccupation}
        placeholder="例: 大学生"
        maxLength={40}
      />

      <Input
        label="Instagram（任意）"
        value={instagram}
        onChangeText={setInstagram}
        placeholder="ユーザー名（@なし）"
        autoCapitalize="none"
        maxLength={30}
      />

      <Text style={[styles.goalLabel, { color: colors.text }]}>
        週のトレーニング目標
      </Text>
      <View style={styles.goalRow}>
        {WEEKLY_GOAL_OPTIONS.map((n) => {
          const selected = weeklyGoal === n;
          return (
            <Pressable
              key={n}
              onPress={() => setWeeklyGoal(selected ? null : n)}
              style={[
                styles.goalChip,
                {
                  borderColor: selected ? Brand.accent : colors.border,
                  backgroundColor: selected ? Brand.accent : 'transparent',
                },
              ]}
            >
              <Text
                style={{
                  color: selected ? '#FFF' : colors.text,
                  fontSize: FontSize.caption,
                  fontWeight: '700',
                }}
              >
                週{n}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {errors.weeklyGoal ? (
        <Text style={[styles.goalError, { color: colors.error }]}>{errors.weeklyGoal}</Text>
      ) : null}

      <Text style={[styles.privateLabel, { color: colors.textSecondary }]}>
        自分だけが見る情報
      </Text>

      <Input
        label="身長 cm（任意）"
        value={height}
        onChangeText={setHeight}
        placeholder="例: 170"
        keyboardType="decimal-pad"
      />

      <Input
        label="体重 kg（任意）"
        value={weight}
        onChangeText={setWeight}
        placeholder="例: 65"
        keyboardType="decimal-pad"
      />

      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        ユーザー名 (@{profile?.username}) は変更できません
      </Text>

      <Button title="保存する" onPress={handleSave} loading={loading} />

      <View style={styles.legalRow}>
        <Link href="/legal/privacy" style={[styles.legalLink, { color: Brand.accent }]}>
          プライバシーポリシー
        </Link>
        <Text style={{ color: colors.textSecondary }}> / </Text>
        <Link href="/legal/terms" style={[styles.legalLink, { color: Brand.accent }]}>
          利用規約
        </Link>
      </View>

      <Pressable onPress={handleLogout} style={styles.logout} disabled={deleting}>
        <Text style={[styles.logoutText, { color: colors.error }]}>ログアウト</Text>
      </Pressable>

      <Pressable
        onPress={handleDeleteAccount}
        style={styles.deleteAccount}
        disabled={deleting || loading}
      >
        <Text style={[styles.deleteAccountText, { color: colors.textSecondary }]}>
          {deleting ? '削除しています…' : 'アカウントを削除'}
        </Text>
      </Pressable>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  changePhoto: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  privateLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: Spacing.xl,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  goalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  goalChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  goalError: {
    marginTop: Spacing.xs,
    fontSize: 12,
  },
  hint: {
    fontSize: 13,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  logout: {
    marginTop: Spacing.xxl,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
    flexWrap: 'wrap',
  },
  legalLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  deleteAccount: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.xl,
  },
  deleteAccountText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
