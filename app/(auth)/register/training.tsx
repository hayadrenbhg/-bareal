import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { RegisterStepHeader } from '@/components/auth/RegisterStepHeader';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Button, Input } from '@/components/ui/Form';
import { ChipGroup, OptionSheet, SelectField } from '@/components/ui/SelectField';
import Colors from '@/constants/Colors';
import {
  GYM_OPTIONS,
  TRAINING_EXPERIENCE_OPTIONS,
  TRAINING_GOAL_OPTIONS,
  type GymOptionKey,
  type TrainingExperienceValue,
  type TrainingGoalValue,
} from '@/constants/register-options';
import { Spacing } from '@/constants/spacing';
import { useAuth } from '@/hooks/useAuth';
import { useRegisterDraft } from '@/hooks/useRegisterDraft';
import { supabase } from '@/lib/supabase';
import { getPostAuthRedirectPath } from '@/services/invite.service';
import {
  replaceTrainingGoals,
  updateProfile,
} from '@/services/profile.service';

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function RegisterTrainingScreen() {
  const colors = Colors.dark;
  const { signUp, refreshProfile } = useAuth();
  const { draft, patchDraft, resetDraft } = useRegisterDraft();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [gymSheet, setGymSheet] = useState(false);
  const [expSheet, setExpSheet] = useState(false);

  const gymLabel = useMemo(() => {
    if (!draft.gymKey) return null;
    return GYM_OPTIONS.find((o) => o.key === draft.gymKey)?.label ?? null;
  }, [draft.gymKey]);

  const expLabel = useMemo(() => {
    if (!draft.trainingExperience) return null;
    return (
      TRAINING_EXPERIENCE_OPTIONS.find((o) => o.value === draft.trainingExperience)
        ?.label ?? null
    );
  }, [draft.trainingExperience]);

  const clearError = (field: string) => {
    if (!errors[field]) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const toggleGoal = (value: string) => {
    const goal = value as TrainingGoalValue;
    const next = draft.trainingGoals.includes(goal)
      ? draft.trainingGoals.filter((g) => g !== goal)
      : [...draft.trainingGoals, goal];
    patchDraft({ trainingGoals: next });
    clearError('goals');
  };

  const resolveGymName = (): string | null => {
    if (!draft.gymKey) return null;
    if (draft.gymKey === 'other') {
      return draft.gymOtherName.trim() || null;
    }
    return GYM_OPTIONS.find((o) => o.key === draft.gymKey)?.label ?? null;
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (!draft.gymKey) newErrors.gym = 'ジムを選択してください';
    if (draft.gymKey === 'other' && !draft.gymOtherName.trim()) {
      newErrors.gymOther = 'ジム名を入力してください';
    }
    if (!draft.trainingExperience) {
      newErrors.experience = 'トレーニング歴を選択してください';
    }
    if (draft.trainingGoals.length === 0) {
      newErrors.goals = '目的を1つ以上選んでください';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!draft.birthDate) {
      Alert.alert('入力エラー', '生年月日が未設定です。前の画面に戻ってください。');
      return;
    }

    setLoading(true);
    try {
      const { hasSession } = await signUp({
        username: draft.username.trim().toLowerCase(),
        email: draft.email.trim(),
        password: draft.password,
      });

      if (!hasSession) {
        Alert.alert(
          '確認メールを送信しました',
          'メール確認後にログインし、続きを完了してください。',
          [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }],
        );
        resetDraft();
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('ユーザー情報の取得に失敗しました');
      }

      await updateProfile(user.id, {
        display_name: draft.displayName.trim(),
        birth_date: toDateString(draft.birthDate),
        gender: draft.gender,
        gym_name: resolveGymName(),
        training_experience: draft.trainingExperience,
        onboarding_completed: true,
      });

      await replaceTrainingGoals(user.id, draft.trainingGoals);
      await refreshProfile();
      resetDraft();
      const next = await getPostAuthRedirectPath();
      router.replace(next as '/(tabs)');
    } catch (error) {
      Alert.alert(
        '登録エラー',
        error instanceof Error ? error.message : '登録に失敗しました',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper scroll>
      <RegisterStepHeader step={3} title="あなたのトレーニング" />

      <SelectField
        label="通っているジム"
        valueLabel={gymLabel}
        error={errors.gym}
        onPress={() => setGymSheet(true)}
      />

      {draft.gymKey === 'other' ? (
        <Input
          label="ジム名"
          value={draft.gymOtherName}
          onChangeText={(value) => {
            patchDraft({ gymOtherName: value });
            clearError('gymOther');
          }}
          error={errors.gymOther}
          placeholder="ジム名を入力"
        />
      ) : null}

      <SelectField
        label="トレーニング歴"
        valueLabel={expLabel}
        error={errors.experience}
        onPress={() => setExpSheet(true)}
      />

      <View style={styles.goalBlock}>
        <Text style={[styles.goalLabel, { color: colors.textSecondary }]}>
          トレーニング目的
        </Text>
        <ChipGroup
          options={TRAINING_GOAL_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
          selected={draft.trainingGoals}
          onToggle={toggleGoal}
          error={errors.goals}
        />
      </View>

      <OptionSheet
        visible={gymSheet}
        title="通っているジム"
        options={GYM_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
        selectedValue={draft.gymKey}
        onSelect={(value) => {
          patchDraft({ gymKey: value as GymOptionKey });
          clearError('gym');
        }}
        onClose={() => setGymSheet(false)}
      />

      <OptionSheet
        visible={expSheet}
        title="トレーニング歴"
        options={TRAINING_EXPERIENCE_OPTIONS.map((o) => ({
          value: o.value,
          label: o.label,
        }))}
        selectedValue={draft.trainingExperience}
        onSelect={(value) => {
          patchDraft({ trainingExperience: value as TrainingExperienceValue });
          clearError('experience');
        }}
        onClose={() => setExpSheet(false)}
      />

      <Button
        title="登録を完了"
        onPress={handleSubmit}
        loading={loading}
        style={styles.cta}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  goalBlock: {
    marginTop: Spacing.lg,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  cta: {
    marginTop: Spacing.xl,
  },
});
