import { StyleSheet, Text, View } from 'react-native';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import Colors from '@/constants/Colors';
import type { LegalSection } from '@/constants/legal';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';

type LegalDocumentProps = {
  title: string;
  intro: string;
  sections: LegalSection[];
};

export function LegalDocument({ title, intro, sections }: LegalDocumentProps) {
  const colors = Colors.dark;

  return (
    <ScreenWrapper scroll>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.intro, { color: colors.textSecondary }]}>{intro}</Text>
      {sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text style={[styles.heading, { color: colors.text }]}>{section.heading}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{section.body}</Text>
        </View>
      ))}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: FontSize.title,
    fontWeight: '700',
    marginTop: Spacing.lg,
  },
  intro: {
    fontSize: FontSize.body,
    lineHeight: 22,
    marginTop: Spacing.md,
  },
  section: {
    marginTop: Spacing.xl,
  },
  heading: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: FontSize.body,
    lineHeight: 22,
  },
});
