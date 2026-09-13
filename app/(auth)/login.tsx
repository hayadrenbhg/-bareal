import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Button, Input } from '@/components/ui/Form';
import Colors, { Brand } from '@/constants/Colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useAuth } from '@/hooks/useAuth';
import { LegalLinks } from '@/components/legal/LegalLinks';
import { getPostAuthRedirectPath } from '@/services/invite.service';
import { validateEmail, validatePassword } from '@/utils/validation';

export default function LoginScreen() {
  const colors = Colors.dark;
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) => {
    if (!errors[field]) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleLogin = async () => {
    const emailResult = validateEmail(email);
    const passwordResult = validatePassword(password);

    const newErrors: Record<string, string> = {};
    if (!emailResult.valid) newErrors.email = emailResult.message!;
    if (!passwordResult.valid) newErrors.password = passwordResult.message!;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await signIn({ email: email.trim(), password });
      const next = await getPostAuthRedirectPath();
      router.replace(next as '/(tabs)');
    } catch (error) {
      Alert.alert(
        'ログインエラー',
        error instanceof Error ? error.message : 'ログインに失敗しました',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper scroll>
      <View style={styles.header}>
        <Text style={[styles.logo, { color: Brand.accent }]}>{Brand.name}</Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
          筋トレを、もっと続けやすく。
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          label="メールアドレス"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            clearError('email');
          }}
          error={errors.email}
          keyboardType="email-address"
          autoComplete="email"
          placeholder="you@example.com"
        />
        <Input
          label="パスワード"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            clearError('password');
          }}
          error={errors.password}
          secureTextEntry
          autoComplete="current-password"
          placeholder="パスワード"
        />
      </View>

      <Button title="ログイン" onPress={handleLogin} loading={loading} style={styles.cta} />

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          アカウントをお持ちでないですか？
        </Text>
        <Link href="/(auth)/register" style={[styles.link, { color: Brand.accent }]}>
          新規登録
        </Link>
      </View>
      <LegalLinks prefix="ログインすると" />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: Spacing.xxxl,
    marginBottom: Spacing.xl,
  },
  logo: {
    fontSize: FontSize.brand,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  tagline: {
    fontSize: FontSize.body,
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  form: {
    marginBottom: Spacing.sm,
  },
  cta: {
    marginTop: Spacing.lg,
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
