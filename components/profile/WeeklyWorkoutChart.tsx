import { StyleSheet, Text, View } from 'react-native';

import Colors, { Brand } from '@/constants/Colors';
import { BODY_PART_LABEL, type BodyPartKey } from '@/constants/training';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useColorScheme } from '@/components/useColorScheme';
import type { WeeklyWorkoutSummary } from '@/utils/weekly-workout';
import { remainingToGoal } from '@/services/workouts.service';

type WeeklyWorkoutChartProps = {
  summary: WeeklyWorkoutSummary;
  monthlyCount?: number;
  weeklyStreak?: number;
  bodyPartCounts?: Partial<Record<BodyPartKey, number>>;
};

/** 7日分のシンプルな棒グラフ + 軽い集計（ライブラリなし） */
export function WeeklyWorkoutChart({
  summary,
  monthlyCount,
  weeklyStreak = 0,
  bodyPartCounts,
}: WeeklyWorkoutChartProps) {
  const colors = Colors[useColorScheme()];
  const goalText =
    summary.goal != null ? `${summary.count} / ${summary.goal}` : `${summary.count} 回`;
  const remain = remainingToGoal(summary.count, summary.goal);

  const bodyEntries = Object.entries(bodyPartCounts ?? {})
    .map(([key, count]) => ({
      key: key as BodyPartKey,
      label: BODY_PART_LABEL[key as BodyPartKey] ?? key,
      count: count ?? 0,
    }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count);
  const maxBody = Math.max(1, ...bodyEntries.map((e) => e.count));

  const monthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    timeZone: 'Asia/Tokyo',
  }).format(new Date());

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>今週のトレーニング</Text>
        <Text style={[styles.count, { color: colors.textSecondary }]}>{goalText}</Text>
      </View>
      {remain ? (
        <Text style={[styles.remain, { color: Brand.accent }]}>{remain}</Text>
      ) : null}

      <View style={styles.bars}>
        {summary.days.map((day) => (
          <View key={day.key} style={styles.barCol}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    height: day.workout ? '100%' : 2,
                    backgroundColor: day.workout ? Brand.accent : colors.border,
                  },
                ]}
              />
            </View>
            <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>{day.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.metaRow}>
        {weeklyStreak > 0 ? (
          <Text style={[styles.metaText, { color: colors.text }]}>
            🔥 {weeklyStreak}週間連続達成
          </Text>
        ) : (
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            週目標を達成するとStreakが伸びます
          </Text>
        )}
        {monthlyCount != null ? (
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {monthLabel} {monthlyCount}
          </Text>
        ) : null}
      </View>

      {bodyEntries.length > 0 ? (
        <View style={styles.bodySection}>
          <Text style={[styles.bodyTitle, { color: colors.textSecondary }]}>今週の部位</Text>
          {bodyEntries.map((entry) => (
            <View key={entry.key} style={styles.bodyRow}>
              <Text style={[styles.bodyLabel, { color: colors.text }]}>{entry.label}</Text>
              <View style={[styles.bodyTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.bodyFill,
                    {
                      width: `${(entry.count / maxBody) * 100}%`,
                      backgroundColor: Brand.accent,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.bodyCount, { color: colors.textSecondary }]}>
                {entry.count}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize.section,
    fontWeight: '600',
  },
  count: {
    fontSize: FontSize.body,
  },
  remain: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 72,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  barTrack: {
    width: 14,
    height: 48,
    justifyContent: 'flex-end',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 3,
  },
  dayLabel: {
    fontSize: FontSize.caption,
  },
  metaRow: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  metaText: {
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
  bodySection: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  bodyTitle: {
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bodyLabel: {
    width: 48,
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
  bodyTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  bodyFill: {
    height: '100%',
    borderRadius: 3,
  },
  bodyCount: {
    width: 20,
    textAlign: 'right',
    fontSize: FontSize.caption,
  },
});
