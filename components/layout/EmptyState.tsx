import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useColorScheme } from '@/components/useColorScheme';

type EmptyStateProps = {
  title: string;
  message?: string;
};

export function EmptyState({ title, message }: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {message ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxxl,
  },
  title: {
    fontSize: FontSize.section,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    marginTop: Spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
