import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RegisterStepHeader } from '@/components/auth/RegisterStepHeader';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Button, Input } from '@/components/ui/Form';
import Colors, { Brand } from '@/constants/Colors';
import { Spacing } from '@/constants/spacing';
import { useRegisterDraft } from '@/hooks/useRegisterDraft';
import { LegalLinks } from '@/components/legal/LegalLinks';
import { isUsernameAvailable } from '@/services/auth.service';
import {
  validateEmail,
  validatePassword,
  validateUsername,
} from '@/utils/validation';

export default function RegisterStep1Screen() {
  const colors = Colors.dark;
  const { draft, patchDraft } = useRegisterDraft();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checking, setChecking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const clearError = (field: string) => {
    if (!errors[field]) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleNext = async () => {
    const usernameResult = validateUsername(draft.username);
    const emailResult = validateEmail(draft.email);
    const passwordResult = validatePassword(draft.password);

    const newErrors: Record<string, string> = {};
    if (!usernameResult.valid) newErrors.username = usernameResult.message!;
    if (!emailResult.valid) newErrors.email = emailResult.message!;
    if (!passwordResult.valid) newErrors.password = passwordResult.message!;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setChecking(true);
    try {
      const available = await isUsernameAvailable(draft.username);
      if (!available) {
        setErrors({ username: 'このユーザー名は既に使用されています' });
        return;
      }
      setErrors({});
      router.push('/(auth)/register/profile');
    } catch (error) {
      setErrors({
        username:
          error instanceof Error ? error.message : 'ユーザー名の確認に失敗しました',
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <ScreenWrapper scroll>
      <RegisterStepHeader
        step={1}
        title="アカウントを作成"
        onBack={() => router.replace('/(auth)/login')}
      />

      <Input
        label="ユーザー名"
        value={draft.username}
        onChangeText={(value) => {
          patchDraft({ username: value });
          clearError('username');
        }}
        error={errors.username}
        autoComplete="username"
        maxLength={20}
        placeholder="英数字のみ"
      />
      <Input
        label="メールアドレス"
        value={draft.email}
        onChangeText={(value) => {
          patchDraft({ email: value });
          clearError('email');
        }}
        error={errors.email}
        keyboardType="email-address"
        autoComplete="email"
        placeholder="you@example.com"
      />
      <Input
        label="パスワード"
        value={draft.password}
        onChangeText={(value) => {
          patchDraft({ password: value });
          clearError('password');
        }}
        error={errors.password}
        secureTextEntry={!showPassword}
        autoComplete="new-password"
        placeholder="8文字以上"
      />
      <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
        <Text style={[styles.toggle, { color: colors.textSecondary }]}>
          {showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
        </Text>
      </Pressable>

      <Button
        title="次へ"
        onPress={handleNext}
        loading={checking}
        style={styles.cta}
      />

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          すでにアカウントを持っていますか？
        </Text>
        <Link href="/(auth)/login" style={[styles.link, { color: Brand.accent }]}>
          ログイン
        </Link>
      </View>
      <LegalLinks prefix="登録すると" />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  toggle: {
    fontSize: 13,
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
  },
  cta: {
    marginTop: Spacing.xl,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: 14,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
  },
});
