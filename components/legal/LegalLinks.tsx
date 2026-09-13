import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import Colors, { Brand } from '@/constants/Colors';
import { Spacing } from '@/constants/spacing';

type LegalLinksProps = {
  prefix?: string;
};

export function LegalLinks({ prefix = '利用することで' }: LegalLinksProps) {
  const colors = Colors.dark;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        {prefix}
        <Link href="/legal/terms" style={[styles.link, { color: Brand.accent }]}>
          利用規約
        </Link>
        と
        <Link href="/legal/privacy" style={[styles.link, { color: Brand.accent }]}>
          プライバシーポリシー
        </Link>
        に同意したものとみなします。
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  text: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  link: {
    fontSize: 12,
    fontWeight: '700',
  },
});
