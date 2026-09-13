import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import Colors from '@/constants/Colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

type RegisterStepHeaderProps = {
  step: 1 | 2 | 3;
  title: string;
  subtitle?: string;
  /** STEP1 ではログインへ戻す */
  onBack?: () => void;
};

export function RegisterStepHeader({
  step,
  title,
  subtitle,
  onBack,
}: RegisterStepHeaderProps) {
  const colors = Colors.dark;

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/login');
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Pressable onPress={handleBack} hitSlop={12} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.text }]}>←</Text>
        </Pressable>
        <Text style={[styles.progress, { color: colors.textSecondary }]}>
          {step} / 3
        </Text>
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: Spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 22,
  },
  progress: {
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: FontSize.body,
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
});
