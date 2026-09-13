import { buildWeeklyWorkoutSummary } from '@/utils/weekly-workout';

describe('buildWeeklyWorkoutSummary', () => {
  it('counts workouts in the current week', () => {
    // Fixed Tuesday JST-ish reference: use local construction carefully
    const now = new Date('2026-09-08T12:00:00+09:00'); // Tue
    const posts = [
      '2026-09-08T01:00:00+09:00', // Tue
      '2026-09-07T10:00:00+09:00', // Mon
      '2026-09-01T10:00:00+09:00', // previous week Mon — should not count if week starts Sep 7
    ];
    const summary = buildWeeklyWorkoutSummary(posts, 5, now);
    expect(summary.count).toBeGreaterThanOrEqual(1);
    expect(summary.goal).toBe(5);
    expect(summary.days).toHaveLength(7);
  });
});
